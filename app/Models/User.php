<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'city',
        'address',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function userEvents(): HasMany
    {
        return $this->hasMany(UserEvent::class);
    }

    public function recommendations(): HasMany
    {
        return $this->hasMany(AiRecommendation::class);
    }

    public function scopeInCity(\Illuminate\Database\Eloquent\Builder $query, string $city): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('city', $city);
    }
}
