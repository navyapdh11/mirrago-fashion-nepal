<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\InventorySyncService;
use App\Services\PaymentGateways\PaymentFailoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function __construct(
        protected PaymentFailoverService $paymentFailoverService,
        protected InventorySyncService $inventorySyncService,
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        // Support both legacy backend format and frontend format
        $isFrontendFormat = $request->has('items') && $request->has('shipping_info');

        if ($isFrontendFormat) {
            // Frontend format: { items, shipping_info, payment_method }
            $validated = $request->validate([
                'items' => ['required', 'array', 'min:1'],
                'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
                'items.*.size' => ['nullable', 'string', 'max:50'],
                'items.*.quantity' => ['required', 'integer', 'min:1'],
                'shipping_info.fullName' => ['required', 'string', 'max:255'],
                'shipping_info.phone' => ['required', 'string', 'max:20'],
                'shipping_info.address' => ['required', 'string', 'max:500'],
                'shipping_info.city' => ['required', 'string', 'max:255'],
                'shipping_info.email' => ['nullable', 'email', 'max:255'],
                'payment_method' => ['required', 'in:esewa,khalti'],
            ]);
        } else {
            // Legacy backend format
            $validated = $request->validate([
                'items' => ['required', 'array', 'min:1'],
                'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
                'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
                'items.*.quantity' => ['required', 'integer', 'min:1'],
                'shipping_city' => ['required', 'string', 'max:255'],
                'shipping_address' => ['required', 'string', 'max:500'],
                'customer_name' => ['required', 'string', 'max:255'],
                'customer_phone' => ['required', 'string', 'max:20'],
                'customer_email' => ['nullable', 'email', 'max:255'],
                'payment_gateway' => ['required', 'in:esewa,khalti'],
            ]);
        }

        return DB::transaction(function () use ($validated, $isFrontendFormat): JsonResponse {
            // Normalize to backend format
            if ($isFrontendFormat) {
                $validated = [
                    'items' => $validated['items'],
                    'shipping_city' => $validated['shipping_info']['city'],
                    'shipping_address' => $validated['shipping_info']['address'],
                    'customer_name' => $validated['shipping_info']['fullName'],
                    'customer_phone' => $validated['shipping_info']['phone'],
                    'customer_email' => $validated['shipping_info']['email'] ?? null,
                    'payment_gateway' => $validated['payment_method'],
                ];
            }

            $subtotal = 0.0;
            $items = [];
            $customerCity = $validated['shipping_city'];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Find variant by size if provided
                $variant = null;
                if (!empty($item['size'])) {
                    $variant = ProductVariant::where('product_id', $product->id)
                        ->where('size', $item['size'])
                        ->where('is_active', true)
                        ->first();
                }

                // Fallback to variant_id if provided (legacy format)
                if ($variant === null && !empty($item['variant_id'])) {
                    $variant = ProductVariant::findOrFail($item['variant_id']);
                }

                $price = (float) ($variant?->price ?? $product->price);
                $quantity = (int) $item['quantity'];
                $total = $price * $quantity;
                $subtotal += $total;

                $items[] = [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant?->id,
                    'quantity' => $quantity,
                    'price' => $price,
                    'total' => $total,
                    'size' => $item['size'] ?? $variant?->size,
                ];

                // Reserve inventory if variant specified
                if ($variant !== null) {
                    $reservation = $this->inventorySyncService->reserveStock(
                        $variant->id,
                        $quantity,
                        $customerCity
                    );

                    if ($reservation === null) {
                        throw new \RuntimeException("Insufficient stock for product: {$product->name}");
                    }
                }
            }

            $tax = round($subtotal * 0.13, 2); // 13% VAT in Nepal
            $shipping = 100.0; // Flat rate NPR 100
            $total = round($subtotal + $tax + $shipping, 2);

            $order = Order::create([
                'user_id' => auth()->id(),
                'session_id' => session()->getId(),
                'status' => 'pending',
                'subtotal' => $subtotal,
                'shipping_cost' => $shipping,
                'tax' => $tax,
                'total' => $total,
                'currency' => 'NPR',
                'shipping_city' => $validated['shipping_city'],
                'shipping_address' => $validated['shipping_address'],
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'] ?? null,
                'payment_status' => 'pending',
                'fulfillment_status' => 'pending',
            ]);

            foreach ($items as $itemData) {
                $order->items()->create($itemData);
            }

            $paymentResult = $this->paymentFailoverService->processWithFailover(
                $order,
                $validated['payment_gateway'],
                [
                    'name' => $validated['customer_name'],
                    'phone' => $validated['customer_phone'],
                    'email' => $validated['customer_email'] ?? '',
                ]
            );

            // Load order with relationships and format response
            $order->load(['items.product', 'items.productVariant']);

            return response()->json([
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'subtotal' => (float) $order->subtotal,
                'shipping' => (float) $order->shipping_cost,
                'tax' => (float) $order->tax,
                'total' => (float) $order->total,
                'shipping_name' => $order->customer_name,
                'shipping_phone' => $order->customer_phone,
                'shipping_address' => $order->shipping_address,
                'shipping_city' => $order->shipping_city,
                'shipping_email' => $order->customer_email,
                'payment_method' => $validated['payment_gateway'],
                'payment_status' => $order->payment_status,
                'payment_url' => $paymentResult['payment_url'] ?? null,
                'created_at' => $order->created_at->toIso8601String(),
                'items' => $order->items->map(fn($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->name ?? 'Unknown Product',
                    'size' => $item->size ?? $item->productVariant?->size,
                    'quantity' => $item->quantity,
                    'price' => (float) $item->price,
                    'image_url' => $item->product?->primary_image_url ?? $item->productVariant?->image_url,
                ]),
            ], 201);
        });
    }

    public function show(string $id): JsonResponse
    {
        $user = auth()->user();
        
        $order = Order::with(['items.product', 'items.productVariant', 'payments'])
            ->findOrFail($id);

        // Ensure user can only view their own orders
        if ($order->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'subtotal' => (float) $order->subtotal,
            'shipping' => (float) $order->shipping_cost,
            'tax' => (float) $order->tax,
            'total' => (float) $order->total,
            'shipping_name' => $order->customer_name,
            'shipping_phone' => $order->customer_phone,
            'shipping_address' => $order->shipping_address,
            'shipping_city' => $order->shipping_city,
            'shipping_email' => $order->customer_email,
            'payment_method' => $order->payments->first()?->gateway,
            'payment_status' => $order->payment_status,
            'payment_url' => $order->payments->first()?->payment_url,
            'created_at' => $order->created_at->toIso8601String(),
            'items' => $order->items->map(fn($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name ?? 'Unknown Product',
                'size' => $item->size ?? $item->productVariant?->size,
                'quantity' => $item->quantity,
                'price' => (float) $item->price,
                'image_url' => $item->product?->primary_image_url ?? $item->productVariant?->image_url,
            ]),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = Order::with(['items.product', 'payments'])
            ->where('user_id', $user->id);

        if ($request->filled('status')) {
            $query->byStatus($request->string('status'));
        }

        $perPage = $request->integer('per_page', 20);
        $orders = $query->latest()->paginate(min($perPage, 100));

        // Transform to simple array format for frontend
        return response()->json($orders->items()->map(fn($order) => [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'subtotal' => (float) $order->subtotal,
            'shipping' => (float) $order->shipping_cost,
            'tax' => (float) $order->tax,
            'total' => (float) $order->total,
            'shipping_address' => $order->shipping_address,
            'shipping_city' => $order->shipping_city,
            'payment_status' => $order->payment_status,
            'created_at' => $order->created_at->toIso8601String(),
        ])->toArray());
    }

    public function markAsPaid(string $id): JsonResponse
    {
        $order = Order::findOrFail($id);
        $order->markAsPaid();

        return response()->json(['message' => 'Order marked as paid']);
    }
}
