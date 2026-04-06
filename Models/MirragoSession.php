<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MirragoSession extends Model {
    protected $fillable = ["product_id","session_id","status","converted","result_url"];
    protected $casts = ["converted"=>"boolean"];
}
