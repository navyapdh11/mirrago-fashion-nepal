<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomsDeclaration extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'order_id', 'invoice_number', 'declared_value', 'declared_currency',
        'duty_amount', 'tax_amount', 'status',
        'tracking_number', 'carrier', 'items_detail', 'notes',
    ];

    protected $casts = [
        'declared_value' => 'decimal:2',
        'duty_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'items_detail' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
