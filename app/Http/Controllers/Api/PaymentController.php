<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentGateways\EsewaService;
use App\Services\PaymentGateways\KhaltiService;
use App\Services\PaymentGateways\PaymentFailoverService;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentFailoverService $failoverService,
    ) {
    }

    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'gateway' => ['required', 'in:esewa,khalti'],
        ]);

        $order = Order::findOrFail($validated['order_id']);

        $result = $this->failoverService->processWithFailover(
            $order,
            $validated['gateway'],
            [
                'name' => $order->customer_name,
                'phone' => $order->customer_phone,
                'email' => $order->customer_email ?? '',
            ]
        );

        return response()->json($result);
    }

    public function esewaCallback(Request $request): JsonResponse
    {
        $esewaService = app(EsewaService::class);

        $validated = $request->validate([
            'data' => ['required', 'string'],
            'signature' => ['required', 'string'],
        ]);

        $result = $esewaService->handleCallback(
            ['data' => $validated['data']],
            $validated['signature']
        );

        return response()->json($result);
    }

    public function khaltiWebhook(Request $request): JsonResponse
    {
        $khaltiService = app(KhaltiService::class);

        $signature = $request->header('X-Khalti-Webhook-Secret', '');
        if (!$khaltiService->verifyWebhookSignature($request->getContent(), $signature)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $result = $khaltiService->handleCallback($request->all());

        return response()->json($result);
    }

    public function verify(string $orderId): JsonResponse
    {
        $order = Order::with('payments')->findOrFail($orderId);

        return response()->json([
            'order' => $order,
            'payment_status' => $order->payment_status,
            'payments' => $order->payments,
        ]);
    }

    public function stats(): JsonResponse
    {
        $stats = $this->failoverService->getGatewayStats();

        return response()->json($stats);
    }
}
