<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Order extends Model {
    protected $fillable = ["order_number","customer_name","customer_email","customer_phone","shipping_address","shipping_city","subtotal","shipping_amount","tax_amount","total_amount","status","payment_status","paid_at"];
    protected $casts = ["subtotal"=>"decimal:2","shipping_amount"=>"decimal:2","tax_amount"=>"decimal:2","total_amount"=>"decimal:2","paid_at"=>"datetime"];
    public function items() { return $this->hasMany(OrderItem::class); }
    public function payments() { return $this->hasMany(Payment::class); }
}
