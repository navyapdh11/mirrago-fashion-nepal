<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use App\Models\InventoryLevel;
use App\Services\InventorySyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(
        protected InventorySyncService $inventorySyncService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = InventoryLevel::with(['productVariant.product', 'warehouse']);

        if ($request->filled('product_variant_id')) {
            $query->where('product_variant_id', $request->integer('product_variant_id'));
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->integer('warehouse_id'));
        }

        $perPage = $request->integer('per_page', 20);
        $levels = $query->paginate(min($perPage, 100));

        return response()->json($levels);
    }

    public function checkStock(int $productVariantId): JsonResponse
    {
        $city = request()->get('city', 'Kathmandu');

        $inventory = $this->inventorySyncService->getProductInventoryLevels($productVariantId);
        $nearestWarehouse = $this->inventorySyncService->getNearestWarehouseWithStock($productVariantId, $city);

        return response()->json([
            'product_variant_id' => $productVariantId,
            'warehouses' => $inventory['warehouses'],
            'total_available' => $inventory['total_available'],
            'nearest_warehouse_id' => $nearestWarehouse,
        ]);
    }

    public function syncStock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_variant_id' => ['required', 'exists:product_variants,id'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'stock_qty' => ['required', 'integer', 'min:0'],
        ]);

        $this->inventorySyncService->syncStockForVariant(
            $validated['product_variant_id'],
            $validated['warehouse_id'],
            $validated['stock_qty']
        );

        return response()->json(['message' => 'Stock synced successfully']);
    }

    public function warehouses(): JsonResponse
    {
        $warehouses = Warehouse::active()->get();

        return response()->json($warehouses);
    }

    public function warehousePriority(string $city): JsonResponse
    {
        $priority = $this->inventorySyncService->getWarehouseIdsForCity($city);

        return response()->json([
            'city' => $city,
            'warehouse_ids' => $priority,
        ]);
    }

    public function lowStockAlerts(): JsonResponse
    {
        $lowStock = InventoryLevel::with(['productVariant.product', 'warehouse'])
            ->get()
            ->filter(fn (InventoryLevel $level) => $level->isLowStock())
            ->values();

        return response()->json($lowStock);
    }
}
