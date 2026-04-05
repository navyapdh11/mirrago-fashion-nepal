<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRecommendation extends Model
{
    protected $fillable = [
        'user_id',
        'recommendation_type',
        'product_ids',
        'metadata',
        'expires_at',
    ];

    protected $casts = [
        'product_ids' => 'array',
        'metadata' => 'array',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products()
    {
        return Product::whereIn('id', $this->product_ids)->active()->get();
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('recommendation_type', $type);
    }

    public function scopeValid($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }
}
