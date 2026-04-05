<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class InventoryLevel extends Model
{
    protected $fillable = [
        'product_variant_id',
        'warehouse_id',
        'stock_qty',
        'reserved_qty',
        'reorder_level',
        'last_counted_at',
    ];

    protected $casts = [
        'stock_qty' => 'integer',
        'reserved_qty' => 'integer',
        'reorder_level' => 'integer',
        'last_counted_at' => 'datetime',
    ];

    protected $table = 'inventory_levels';

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getAvailableQtyAttribute(): int
    {
        return max(0, $this->stock_qty - $this->reserved_qty);
    }

    public function isLowStock(): bool
    {
        return $this->available_qty <= $this->reorder_level;
    }

    public function isOutOfStock(): bool
    {
        return $this->available_qty <= 0;
    }

    /**
     * Reserve stock with pessimistic locking to prevent race conditions.
     */
    public function reserve(int $quantity): bool
    {
        $affected = DB::table('inventory_levels')
            ->where('id', $this->id)
            ->where('stock_qty', '>=', DB::raw('reserved_qty + ' . (int) $quantity))
            ->update([
                'reserved_qty' => DB::raw('reserved_qty + ' . (int) $quantity),
                'updated_at' => now(),
            ]);

        if ($affected > 0) {
            $this->reserved_qty += $quantity;
            return true;
        }

        return false;
    }

    /**
     * Release reserved stock with atomic update.
     */
    public function release(int $quantity): void
    {
        $releaseQty = min($quantity, $this->reserved_qty);

        DB::table('inventory_levels')
            ->where('id', $this->id)
            ->update([
                'reserved_qty' => DB::raw("GREATEST(0, reserved_qty - {$releaseQty})"),
                'updated_at' => now(),
            ]);

        $this->reserved_qty = max(0, $this->reserved_qty - $releaseQty);
    }

    /**
     * Fulfill order - deduct from both stock and reserved.
     */
    public function fulfill(int $quantity): void
    {
        $fulfillQty = min($quantity, $this->stock_qty);

        DB::table('inventory_levels')
            ->where('id', $this->id)
            ->update([
                'stock_qty' => DB::raw("GREATEST(0, stock_qty - {$fulfillQty})"),
                'reserved_qty' => DB::raw("GREATEST(0, reserved_qty - {$fulfillQty})"),
                'updated_at' => now(),
            ]);

        $this->stock_qty = max(0, $this->stock_qty - $fulfillQty);
        $this->reserved_qty = max(0, $this->reserved_qty - $fulfillQty);
    }

    /**
     * Adjust stock level atomically.
     */
    public function adjustStock(int $quantityChange): void
    {
        DB::table('inventory_levels')
            ->where('id', $this->id)
            ->update([
                'stock_qty' => DB::raw("GREATEST(0, stock_qty + {$quantityChange})"),
                'updated_at' => now(),
            ]);

        $this->stock_qty = max(0, $this->stock_qty + $quantityChange);
    }
}
