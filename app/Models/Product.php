<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Product extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'sku',
        'description',
        'category',
        'subcategory',
        'brand',
        'color',
        'size',
        'price',
        'compare_price',
        'primary_image_url',
        'image_urls',
        'style_tags',
        'occasion_tags',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'image_urls' => 'array',
        'style_tags' => 'array',
        'occasion_tags' => 'array',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (empty($product->slug) && !empty($product->name)) {
                $product->slug = str($product->name)->slug();
            }
        });
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function mirragoSessions(): HasMany
    {
        return $this->hasMany(MirragoSession::class);
    }

    public function userEvents(): HasMany
    {
        return $this->hasMany(UserEvent::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    public function scopeTrending(Builder $query, int $limit = 10): Builder
    {
        return $query->withCount(['userEvents' => function (Builder $q) {
            $q->where('event_type', 'view')
                ->where('event_timestamp', '>=', now()->subDays(7));
        }])->orderByDesc('user_events_count')->limit($limit);
    }

    public function scopeSearch(Builder $query, string $searchTerm): Builder
    {
        return $query->where(function (Builder $q) use ($searchTerm) {
            $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhere('description', 'like', "%{$searchTerm}%")
                ->orWhere('sku', 'like', "%{$searchTerm}%")
                ->orWhere('brand', 'like', "%{$searchTerm}%");
        });
    }

    public function scopeWhereJsonOverlap(Builder $query, string $column, array $values): Builder
    {
        if (empty($values)) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($column, $values) {
            foreach ($values as $value) {
                $q->orWhereJsonContains($column, $value);
            }
        });
    }

    public function getImageUrlAttribute(): string
    {
        return $this->primary_image_url ?? '/images/placeholder.png';
    }

    public function hasDiscount(): bool
    {
        return $this->compare_price !== null && $this->compare_price > $this->price;
    }

    public function getDiscountPercentageAttribute(): float
    {
        if (!$this->hasDiscount()) {
            return 0.0;
        }

        return round((($this->compare_price - $this->price) / $this->compare_price) * 100, 2);
    }
}
