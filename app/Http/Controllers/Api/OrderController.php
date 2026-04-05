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

        return DB::transaction(function () use ($validated): JsonResponse {
            $subtotal = 0.0;
            $items = [];
            $customerCity = $validated['shipping_city'];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                $variant = $item['variant_id'] !== null
                    ? ProductVariant::findOrFail($item['variant_id'])
                    : null;

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

            return response()->json([
                'order' => $order->load('items.product', 'items.productVariant'),
                'payment' => $paymentResult,
            ], 201);
        });
    }

    public function show(string $id): JsonResponse
    {
        $order = Order::with(['items.product', 'items.productVariant', 'payments'])->findOrFail($id);

        return response()->json($order);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['items.product', 'payments']);

        if ($request->filled('status')) {
            $query->byStatus($request->string('status'));
        }

        if (auth()->check()) {
            $query->where('user_id', auth()->id());
        }

        $perPage = $request->integer('per_page', 20);
        $orders = $query->latest()->paginate(min($perPage, 100));

        return response()->json($orders);
    }

    public function markAsPaid(string $id): JsonResponse
    {
        $order = Order::findOrFail($id);
        $order->markAsPaid();

        return response()->json(['message' => 'Order marked as paid']);
    }
}
