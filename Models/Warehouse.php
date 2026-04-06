<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Warehouse extends Model {
    protected $fillable = ["name","code","city","address","contact_number","manager_name","is_active","operating_hours","latitude","longitude"];
    protected $casts = ["is_active"=>"boolean","operating_hours"=>"array","latitude"=>"decimal:8","longitude"=>"decimal:8"];
    public function inventoryLevels() { return $this->hasMany(InventoryLevel::class); }
    public function scopeActive($q) { return $q->where("is_active", true); }
}
