<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Product extends Model {
    protected $fillable = ["name","slug","sku","description","category","subcategory","brand","color","size","price","compare_price","primary_image_url","image_urls","style_tags","occasion_tags","is_active"];
    protected $casts = ["price"=>"decimal:2","compare_price"=>"decimal:2","is_active"=>"boolean","image_urls"=>"array","occasion_tags"=>"array"];
}
