<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class MirragoSession extends Model
{
    protected $fillable = [
        'product_id',
        'session_id',
        'status',
        'result_url',
        'error_message',
        'metadata',
        'converted',
        'order_id',
    ];

    protected $casts = [
        'metadata' => 'array',
        'converted' => 'boolean',
    ];

    protected $table = 'mirrago_sessions';

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function markAsCompleted(string $resultUrl): void
    {
        $this->update([
            'status' => 'completed',
            'result_url' => $resultUrl,
        ]);
    }

    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
        ]);
    }

    public function trackConversion(bool $purchased, ?int $orderId = null): void
    {
        $this->update([
            'converted' => $purchased,
            'order_id' => $orderId,
        ]);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isProcessing(): bool
    {
        return $this->status === 'processing';
    }

    public function hasFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Get conversion rate for this product using a single efficient query.
     */
    public function getConversionRateAttribute(): float
    {
        $stats = self::selectRaw('COUNT(*) as total, SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as converted_count')
            ->where('product_id', $this->product_id)
            ->first();

        if ($stats === null || $stats->total === 0) {
            return 0.0;
        }

        return round(($stats->converted_count / $stats->total) * 100, 2);
    }

    /**
     * Scope for completed sessions.
     */
    public function scopeCompleted(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for converted sessions (resulted in purchase).
     */
    public function scopeConverted(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('converted', true);
    }
}
