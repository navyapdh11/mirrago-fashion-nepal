<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'size',
        'color',
        'price',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function inventoryLevels(): HasMany
    {
        return $this->hasMany(InventoryLevel::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function getTotalStockAttribute(): int
    {
        return $this->inventoryLevels()->sum('stock_qty');
    }

    public function getAvailableStockAttribute(): int
    {
        return $this->inventoryLevels()->sum(\Illuminate\Support\Facades\DB::raw('stock_qty - reserved_qty'));
    }

    public function isInStock(): bool
    {
        return $this->total_stock > 0;
    }

    public function getDisplayNameAttribute(): string
    {
        $parts = [$this->product->name ?? 'Product'];

        if ($this->size) {
            $parts[] = "Size: {$this->size}";
        }

        if ($this->color) {
            $parts[] = "Color: {$this->color}";
        }

        return implode(' - ', $parts);
    }
}
