<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BulkOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_account_id', 'order_id', 'order_total', 'total_quantity',
        'items', 'status', 'approved_by', 'admin_notes',
        'payment_terms', 'delivery_date',
    ];

    protected $casts = [
        'order_total' => 'decimal:2',
        'total_quantity' => 'integer',
        'items' => 'array',
        'delivery_date' => 'date',
    ];

    public function businessAccount(): BelongsTo
    {
        return $this->belongsTo(BusinessAccount::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
