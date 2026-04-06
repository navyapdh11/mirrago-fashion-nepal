<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InventoryLevel extends Model {
    protected $fillable = ["product_variant_id","warehouse_id","stock_qty","reserved_qty"];
    protected $casts = ["stock_qty"=>"integer","reserved_qty"=>"integer"];
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
}
