<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'session_id',
        'status',
        'subtotal',
        'shipping_cost',
        'tax',
        'discount',
        'total',
        'currency',
        'shipping_city',
        'shipping_address',
        'customer_name',
        'customer_phone',
        'customer_email',
        'payment_status',
        'fulfillment_status',
        'fulfillment_warehouse_id',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function fulfillmentWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'fulfillment_warehouse_id');
    }

    public function mirragoSessions(): HasMany
    {
        return $this->hasMany(MirragoSession::class);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePendingPayment($query)
    {
        return $query->where('payment_status', 'pending');
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'success';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function markAsPaid(): void
    {
        $this->update([
            'payment_status' => 'success',
            'status' => 'confirmed',
        ]);
    }

    public function markAsFulfilled(): void
    {
        $this->update([
            'fulfillment_status' => 'fulfilled',
            'status' => 'completed',
        ]);
    }

    public function cancel(string $reason = ''): void
    {
        $this->update([
            'status' => 'cancelled',
            'notes' => $this->notes . ($this->notes ? "\n" : '') . "Cancelled: {$reason}",
        ]);
    }
}
