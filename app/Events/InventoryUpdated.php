<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InventoryUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $productVariantId,
        public readonly array $stockLevels,
        public readonly string $action = 'sync',
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('inventory'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'product_variant_id' => $this->productVariantId,
            'stock_levels' => $this->stockLevels,
            'action' => $this->action,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
