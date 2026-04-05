<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class UserEvent extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'event_type',
        'product_id',
        'event_timestamp',
        'metadata',
    ];

    protected $casts = [
        'event_timestamp' => 'datetime',
        'metadata' => 'array',
    ];

    protected $table = 'user_events';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function scopeViews(Builder $query): Builder
    {
        return $query->where('event_type', 'view');
    }

    public function scopePurchases(Builder $query): Builder
    {
        return $query->where('event_type', 'purchase');
    }

    public function scopeAddToCarts(Builder $query): Builder
    {
        return $query->where('event_type', 'add_to_cart');
    }

    public function scopeForUserOrSession(Builder $query, ?int $userId, ?string $sessionId): Builder
    {
        return $query->where(function (Builder $q) use ($userId, $sessionId) {
            if ($userId !== null) {
                $q->where('user_id', $userId);
            } elseif ($sessionId !== null) {
                $q->where('session_id', $sessionId);
            }
        });
    }

    public function scopeRecent(Builder $query, int $days = 30): Builder
    {
        return $query->where('event_timestamp', '>=', now()->subDays($days));
    }
}
