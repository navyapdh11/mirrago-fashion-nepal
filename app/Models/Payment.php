<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'gateway',
        'transaction_id',
        'gateway_reference',
        'amount',
        'currency',
        'status',
        'gateway_response',
        'failure_reason',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_response' => 'array',
        'paid_at' => 'datetime',
    ];

    protected $table = 'payments';

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }

    public function isFailed(): bool
    {
        return in_array($this->status, ['failed', 'refunded'], true);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function markAsSuccess(array $gatewayResponse, string $transactionId): void
    {
        $this->update([
            'status' => 'success',
            'gateway_response' => $gatewayResponse,
            'transaction_id' => $transactionId,
            'paid_at' => now(),
        ]);
    }

    public function markAsFailed(string $reason): void
    {
        $this->update([
            'status' => 'failed',
            'failure_reason' => $reason,
        ]);
    }

    public function scopeByGateway(Builder $query, string $gateway): Builder
    {
        return $query->where('gateway', $gateway);
    }

    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->where('status', 'success');
    }

    public function scopeForOrder(Builder $query, int $orderId): Builder
    {
        return $query->where('order_id', $orderId);
    }

    public function getGatewayLabelAttribute(): string
    {
        return match($this->gateway) {
            'esewa' => 'eSewa',
            'khalti' => 'Khalti',
            default => ucfirst($this->gateway),
        };
    }
}
