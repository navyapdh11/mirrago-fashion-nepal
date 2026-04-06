<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cartItems = CartItem::with(['product', 'variant'])
            ->where('user_id', $request->user()->id)
            ->get();

        $items = $cartItems->map(function (CartItem $item) {
            return [
                'id' => $item->id,
                'product' => new ProductResource($item->product),
                'variant_id' => $item->product_variant_id,
                'quantity' => $item->quantity,
                'line_total' => $this->calculateLineTotal($item),
            ];
        });

        $subtotal = $items->sum('line_total');

        return response()->json([
            'items' => $items,
            'subtotal' => round($subtotal, 2),
            'count' => $cartItems->sum('quantity'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $product = Product::active()->findOrFail($validated['product_id']);

        if ($validated['variant_id'] !== null) {
            ProductVariant::findOrFail($validated['variant_id']);
        }

        $cartItem = CartItem::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'product_id' => $validated['product_id'],
                'product_variant_id' => $validated['variant_id'] ?? null,
            ],
            [
                'quantity' => \DB::raw('quantity + ' . (int) $validated['quantity']),
            ]
        );

        // If it's a new record (not updated), set the quantity
        if ($cartItem->wasRecentlyCreated) {
            $cartItem->update(['quantity' => $validated['quantity']]);
        }

        $cartItem->load(['product', 'variant']);

        return response()->json([
            'message' => 'Added to cart',
            'cart_item' => [
                'id' => $cartItem->id,
                'product' => new ProductResource($cartItem->product),
                'variant_id' => $cartItem->product_variant_id,
                'quantity' => $cartItem->quantity,
                'line_total' => $this->calculateLineTotal($cartItem),
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $cartItem = CartItem::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $cartItem->update(['quantity' => $validated['quantity']]);
        $cartItem->load(['product', 'variant']);

        return response()->json([
            'message' => 'Cart updated',
            'cart_item' => [
                'id' => $cartItem->id,
                'product' => new ProductResource($cartItem->product),
                'variant_id' => $cartItem->product_variant_id,
                'quantity' => $cartItem->quantity,
                'line_total' => $this->calculateLineTotal($cartItem),
            ],
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $cartItem = CartItem::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $cartItem->delete();

        return response()->json(['message' => 'Removed from cart']);
    }

    public function clear(Request $request): JsonResponse
    {
        CartItem::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Cart cleared']);
    }

    protected function calculateLineTotal(CartItem $item): float
    {
        $price = (float) ($item->variant?->price ?? $item->product->price);

        return round($price * $item->quantity, 2);
    }
}
