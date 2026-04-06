<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'subtotal' => $this->subtotal,
            'shipping_cost' => $this->shipping_cost,
            'tax' => $this->tax,
            'discount' => $this->discount,
            'total' => $this->total,
            'currency' => $this->currency,
            'shipping_city' => $this->shipping_city,
            'shipping_address' => $this->shipping_address,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_email' => $this->customer_email,
            'payment_status' => $this->payment_status,
            'fulfillment_status' => $this->fulfillment_status,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
