<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingZone extends Model
{
    protected $fillable = [
        'country', 'zone_name', 'zone_code',
        'min_weight', 'max_weight',
        'base_rate', 'per_kg_rate',
        'delivery_days_min', 'delivery_days_max',
        'is_active', 'included_states',
    ];

    protected $casts = [
        'base_rate' => 'decimal:2',
        'per_kg_rate' => 'decimal:2',
        'min_weight' => 'integer',
        'max_weight' => 'integer',
        'delivery_days_min' => 'integer',
        'delivery_days_max' => 'integer',
        'is_active' => 'boolean',
        'included_states' => 'array',
    ];

    public function calculateRate(int $weightGrams): float
    {
        if ($weightGrams <= $this->min_weight) {
            return 0;
        }

        $extraKg = ceil(($weightGrams - $this->min_weight) / 1000);
        return (float) $this->base_rate + ($extraKg * (float) $this->per_kg_rate);
    }

    public static function forCountry(string $country)
    {
        return static::where('country', $country)->where('is_active', true)->get();
    }
}
