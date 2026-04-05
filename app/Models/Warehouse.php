<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;

class Warehouse extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'city',
        'address',
        'contact_number',
        'manager_name',
        'is_active',
        'operating_hours',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'operating_hours' => 'array',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function inventoryLevels(): HasMany
    {
        return $this->hasMany(InventoryLevel::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Calculate distance from warehouse to customer coordinates using Haversine formula.
     * Note: This is a regular method, NOT a Laravel accessor attribute.
     */
    public function distanceTo(float $customerLatitude, float $customerLongitude): float
    {
        if ($this->latitude === null || $this->longitude === null) {
            return PHP_FLOAT_MAX;
        }

        $earthRadius = 6371; // km

        $dLat = deg2rad($customerLatitude - (float) $this->latitude);
        $dLon = deg2rad($customerLongitude - (float) $this->longitude);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad((float) $this->latitude)) * cos(deg2rad($customerLatitude)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Scope to order warehouses by distance to customer.
     */
    public function scopeNearestTo(Builder $query, float $latitude, float $longitude): Builder
    {
        $earthRadius = 6371;

        $latColumn = 'latitude';
        $lonColumn = 'longitude';

        $select = sprintf(
            '*, (%d * acos(cos(radians(%f)) * cos(radians(%s)) * cos(radians(%s) - radians(%f)) + sin(radians(%f)) * sin(radians(%s)))) AS distance',
            $earthRadius,
            $latitude,
            $latColumn,
            $lonColumn,
            $longitude,
            $latitude,
            $latColumn
        );

        return $query->selectRaw($select)->orderBy('distance');
    }

    public function isOpenNow(): bool
    {
        if ($this->operating_hours === null) {
            return true;
        }

        $dayOfWeek = strtolower(now()->format('l'));
        $currentTime = now()->format('H:i');

        if (!isset($this->operating_hours[$dayOfWeek])) {
            return false;
        }

        $hours = $this->operating_hours[$dayOfWeek];

        return $currentTime >= $hours['open'] && $currentTime <= $hours['close'];
    }
}
