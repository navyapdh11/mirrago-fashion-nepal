<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price,
            'compare_price' => $this->compare_price,
            'discount_percentage' => $this->discount_percentage,
            'primary_image_url' => $this->primary_image_url,
            'thumbnail_url' => $this->thumbnail_url,
            'category' => $this->category,
            'rating' => $this->when($this->rating !== null, $this->rating, 0.0),
            'review_count' => $this->when($this->review_count !== null, $this->review_count, 0),
            'stock_status' => $this->stock_status ?? 'in_stock',
            'delivery_estimate' => $this->delivery_estimate ?? '2-3 days',
        ];
    }
}
