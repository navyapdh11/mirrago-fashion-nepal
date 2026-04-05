<?php

namespace App\Events;

use App\Models\InventoryLevel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LowStockAlert
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly InventoryLevel $inventoryLevel,
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('inventory-alerts'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'warehouse_id' => $this->inventoryLevel->warehouse_id,
            'product_variant_id' => $this->inventoryLevel->product_variant_id,
            'available_qty' => $this->inventoryLevel->available_qty,
            'reorder_level' => $this->inventoryLevel->reorder_level,
            'shortage' => $this->inventoryLevel->reorder_level - $this->inventoryLevel->available_qty,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
