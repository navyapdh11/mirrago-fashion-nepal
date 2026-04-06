<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ProductVariant extends Model {
    protected $fillable = ["product_id","sku","size","price","stock_qty"];
    protected $casts = ["price"=>"decimal:2","stock_qty"=>"integer"];
    public function product() { return $this->belongsTo(Product::class); }
}
