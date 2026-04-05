<?php

namespace App\Services;

use App\Models\Warehouse;
use App\Models\InventoryLevel;
use App\Models\ProductVariant;
use App\Events\InventoryUpdated;
use App\Events\LowStockAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;
use Exception;

class InventorySyncService
{
    /**
     * City-to-warehouse priority mapping for Nepal.
     */
    protected array $cityWarehousePriority = [
        'kathmandu' => [1, 4, 2, 5, 3],
        'lalitpur' => [1, 4, 2, 5, 3],
        'bhaktapur' => [1, 4, 2, 5, 3],
        'birgunj' => [2, 1, 5, 3, 4],
        'birganj' => [2, 1, 5, 3, 4],
        'nepalgunj' => [3, 1, 4, 2, 5],
        'pokhara' => [4, 1, 3, 2, 5],
        'chitwan' => [2, 1, 4, 3, 5],
        'bharatpur' => [2, 1, 4, 3, 5],
        'biratnagar' => [5, 1, 2, 4, 3],
    ];

    /**
     * Sync stock levels across all warehouses.
     */
    public function syncAcrossWarehouses(int $productVariantId, array $stockLevels): void
    {
        DB::transaction(function () use ($productVariantId, $stockLevels) {
            foreach ($stockLevels as $warehouseId => $qty) {
                InventoryLevel::updateOrCreate(
                    [
                        'product_variant_id' => $productVariantId,
                        'warehouse_id' => $warehouseId,
                    ],
                    [
                        'stock_qty' => $qty,
                        'last_counted_at' => now(),
                    ]
                );
            }
        });

        event(new InventoryUpdated($productVariantId, $stockLevels));

        Cache::forget("inventory:variant:{$productVariantId}");

        Log::info('Inventory synced across warehouses', [
            'product_variant_id' => $productVariantId,
            'warehouse_count' => count($stockLevels),
        ]);
    }

    /**
     * Get nearest warehouse with stock for a product variant.
     */
    public function getNearestWarehouseWithStock(int $productVariantId, string $customerCity): ?int
    {
        $warehousePriorities = $this->getWarehouseIdsForCity($customerCity);

        foreach ($warehousePriorities as $warehouseId) {
            $availableQty = InventoryLevel::where('product_variant_id', $productVariantId)
                ->where('warehouse_id', $warehouseId)
                ->value(DB::raw('stock_qty - reserved_qty'));

            if ($availableQty > 0) {
                return $warehouseId;
            }
        }

        return null;
    }

    /**
     * Get total available stock across all warehouses.
     */
    public function getTotalAvailableStock(int $productVariantId): int
    {
        return (int) InventoryLevel::where('product_variant_id', $productVariantId)
            ->sum(DB::raw('GREATEST(0, stock_qty - reserved_qty)'));
    }

    /**
     * Reserve stock from nearest warehouse with availability.
     * Falls back to splitting across warehouses if single warehouse is insufficient.
     */
    public function reserveStock(int $productVariantId, int $quantity, string $customerCity = 'Kathmandu'): ?array
    {
        $warehouseId = $this->getNearestWarehouseWithStock($productVariantId, $customerCity);

        if ($warehouseId !== null) {
            $inventoryLevel = InventoryLevel::where('product_variant_id', $productVariantId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            if ($inventoryLevel !== null && $inventoryLevel->reserve($quantity)) {
                return [
                    'warehouse_id' => $warehouseId,
                    'quantity' => $quantity,
                    'split' => false,
                ];
            }
        }

        // Try to split across warehouses
        return $this->splitReservation($productVariantId, $quantity);
    }

    /**
     * Sync stock for a specific variant at a specific warehouse.
     */
    public function syncStockForVariant(int $productVariantId, int $warehouseId, int $quantity): void
    {
        InventoryLevel::updateOrCreate(
            [
                'product_variant_id' => $productVariantId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'stock_qty' => $quantity,
                'last_counted_at' => now(),
            ]
        );

        Cache::forget("inventory:variant:{$productVariantId}");
        event(new InventoryUpdated($productVariantId, [$warehouseId => $quantity]));
    }

    /**
     * Split reservation across multiple warehouses if single warehouse doesn't have enough.
     */
    protected function splitReservation(int $productVariantId, int $quantity): ?array
    {
        $warehouses = Warehouse::active()->get();
        $reserved = [];
        $remaining = $quantity;

        foreach ($warehouses as $warehouse) {
            if ($remaining <= 0) {
                break;
            }

            $inventoryLevel = InventoryLevel::where('product_variant_id', $productVariantId)
                ->where('warehouse_id', $warehouse->id)
                ->lockForUpdate()
                ->first();

            if ($inventoryLevel !== null && $inventoryLevel->available_qty > 0) {
                $reserveQty = min($remaining, $inventoryLevel->available_qty);

                if ($inventoryLevel->reserve($reserveQty)) {
                    $reserved[] = [
                        'warehouse_id' => $warehouse->id,
                        'quantity' => $reserveQty,
                    ];

                    $remaining -= $reserveQty;
                }
            }
        }

        if ($remaining > 0) {
            // Couldn't fulfill completely, rollback
            foreach ($reserved as $res) {
                $inventoryLevel = InventoryLevel::where('product_variant_id', $productVariantId)
                    ->where('warehouse_id', $res['warehouse_id'])
                    ->lockForUpdate()
                    ->first();

                if ($inventoryLevel !== null) {
                    $inventoryLevel->release($res['quantity']);
                }
            }

            return null;
        }

        return [
            'warehouses' => $reserved,
            'split' => true,
            'total_quantity' => $quantity,
        ];
    }

    /**
     * Release reserved stock.
     */
    public function releaseStock(int $productVariantId, int $quantity, int $warehouseId): void
    {
        $inventoryLevel = InventoryLevel::where('product_variant_id', $productVariantId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        if ($inventoryLevel !== null) {
            $inventoryLevel->release($quantity);
        }
    }

    /**
     * Fulfill order (deduct from stock).
     */
    public function fulfillOrder(int $productVariantId, int $quantity, int $warehouseId): void
    {
        $inventoryLevel = InventoryLevel::where('product_variant_id', $productVariantId)
            ->where('warehouse_id', $warehouseId)
            ->lockForUpdate()
            ->first();

        if ($inventoryLevel !== null) {
            $inventoryLevel->fulfill($quantity);

            if ($inventoryLevel->isLowStock()) {
                event(new LowStockAlert($inventoryLevel));
            }
        }
    }

    /**
     * Get warehouse inventory summary.
     */
    public function getWarehouseInventorySummary(?int $warehouseId = null): array
    {
        $query = InventoryLevel::join('warehouses', 'inventory_levels.warehouse_id', '=', 'warehouses.id')
            ->select(
                'warehouses.id as warehouse_id',
                'warehouses.name as warehouse_name',
                'warehouses.city as warehouse_city',
                DB::raw('SUM(inventory_levels.stock_qty) as total_stock'),
                DB::raw('SUM(inventory_levels.reserved_qty) as total_reserved'),
                DB::raw('SUM(GREATEST(0, inventory_levels.stock_qty - inventory_levels.reserved_qty)) as total_available'),
                DB::raw('COUNT(DISTINCT inventory_levels.product_variant_id) as unique_products')
            )
            ->groupBy('warehouses.id', 'warehouses.name', 'warehouses.city');

        if ($warehouseId !== null) {
            $query->where('warehouses.id', $warehouseId);
        }

        return $query->get()->toArray();
    }

    /**
     * Transfer stock between warehouses.
     */
    public function transferStock(int $productVariantId, int $fromWarehouseId, int $toWarehouseId, int $quantity): array
    {
        try {
            DB::transaction(function () use ($productVariantId, $fromWarehouseId, $toWarehouseId, $quantity) {
                $sourceInventory = InventoryLevel::where('product_variant_id', $productVariantId)
                    ->where('warehouse_id', $fromWarehouseId)
                    ->lockForUpdate()
                    ->first();

                if ($sourceInventory === null || $sourceInventory->available_qty < $quantity) {
                    throw new Exception('Insufficient stock at source warehouse');
                }

                $sourceInventory->adjustStock(-$quantity);

                $destInventory = InventoryLevel::firstOrCreate(
                    [
                        'product_variant_id' => $productVariantId,
                        'warehouse_id' => $toWarehouseId,
                    ],
                    ['stock_qty' => 0, 'reserved_qty' => 0]
                );

                $destInventory->adjustStock($quantity);
            });

            Cache::forget("inventory:variant:{$productVariantId}");

            Log::info('Stock transferred between warehouses', [
                'product_variant_id' => $productVariantId,
                'from' => $fromWarehouseId,
                'to' => $toWarehouseId,
                'quantity' => $quantity,
            ]);

            return ['success' => true];

        } catch (Exception $e) {
            Log::error('Stock transfer failed', [
                'product_variant_id' => $productVariantId,
                'from' => $fromWarehouseId,
                'to' => $toWarehouseId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get inventory levels for a product across all warehouses.
     */
    public function getProductInventoryLevels(int $productVariantId): array
    {
        return Cache::remember("inventory:variant:{$productVariantId}", 300, function () use ($productVariantId) {
            $levels = InventoryLevel::join('warehouses', 'inventory_levels.warehouse_id', '=', 'warehouses.id')
                ->where('product_variant_id', $productVariantId)
                ->select(
                    'warehouses.id as warehouse_id',
                    'warehouses.name as warehouse_name',
                    'warehouses.city as warehouse_city',
                    'inventory_levels.stock_qty',
                    'inventory_levels.reserved_qty',
                    DB::raw('GREATEST(0, inventory_levels.stock_qty - inventory_levels.reserved_qty) as available_qty')
                )
                ->get()
                ->toArray();

            return [
                'product_variant_id' => $productVariantId,
                'warehouses' => $levels,
                'total_available' => array_sum(array_column($levels, 'available_qty')),
            ];
        });
    }

    /**
     * Get warehouse IDs ordered by priority for a city.
     */
    public function getWarehouseIdsForCity(string $customerCity): array
    {
        $normalizedCity = strtolower(trim($customerCity));

        return $this->cityWarehousePriority[$normalizedCity]
            ?? array_values(Warehouse::active()->orderBy('id')->pluck('id')->toArray());
    }

    /**
     * Bulk update inventory for initial sync.
     */
    public function bulkUpdateInventory(array $updates): array
    {
        $updated = 0;
        $errors = [];

        DB::transaction(function () use ($updates, &$updated, &$errors) {
            foreach ($updates as $update) {
                try {
                    InventoryLevel::updateOrCreate(
                        [
                            'product_variant_id' => $update['product_variant_id'],
                            'warehouse_id' => $update['warehouse_id'],
                        ],
                        [
                            'stock_qty' => $update['stock_qty'],
                            'reserved_qty' => $update['reserved_qty'] ?? 0,
                            'last_counted_at' => now(),
                        ]
                    );
                    $updated++;
                } catch (Exception $e) {
                    $errors[] = [
                        'update' => $update,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        return [
            'success' => true,
            'updated' => $updated,
            'errors' => $errors,
        ];
    }
}
