<?php

namespace App\Services\PaymentGateways;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentFailoverService
{
    protected EsewaService $esewaService;
    protected KhaltiService $khaltiService;

    public function __construct(EsewaService $esewaService, KhaltiService $khaltiService)
    {
        $this->esewaService = $esewaService;
        $this->khaltiService = $khaltiService;
    }

    /**
     * Process payment with automatic failover.
     * Tries primary gateway, falls back to secondary on failure.
     */
    public function processWithFailover(Order $order, string $preferredGateway, array $customerDetails = []): array
    {
        $gateways = $this->buildGatewayOrder($preferredGateway);
        $results = [];

        foreach ($gateways as $index => $gateway) {
            Log::info("Attempting payment via {$gateway}", [
                'order_id' => $order->id,
                'attempt' => $index + 1,
                'total_attempts' => count($gateways),
            ]);

            try {
                $result = $this->initiateGateway($gateway, $order, $customerDetails);
                $results[$gateway] = $result;

                if ($result['success']) {
                    Log::info("Payment initiated successfully via {$gateway}", [
                        'order_id' => $order->id,
                        'payment_id' => $result['payment_id'] ?? null,
                    ]);

                    return [
                        'success' => true,
                        'gateway' => $gateway,
                        ...$result,
                    ];
                }

                Log::warning("Gateway {$gateway} failed, trying fallback", [
                    'order_id' => $order->id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
            } catch (Throwable $e) {
                Log::error("Gateway {$gateway} threw exception", [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);

                $results[$gateway] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        Log::error('All payment gateways failed', [
            'order_id' => $order->id,
            'results' => $results,
        ]);

        return [
            'success' => false,
            'error' => 'All payment gateways are currently unavailable. Please try again later.',
            'attempts' => $results,
        ];
    }

    /**
     * Verify payment with gateway-specific logic.
     */
    public function verifyPayment(string $gateway, array $data): array
    {
        return match($gateway) {
            'esewa' => $this->esewaService->verifyPayment($data),
            'khalti' => $this->khaltiService->verifyPayment($data['pidx'] ?? ''),
            default => ['success' => false, 'error' => 'Invalid gateway: ' . $gateway],
        };
    }

    /**
     * Get gateway stats for monitoring.
     */
    public function getGatewayStats(): array
    {
        $stats = [];

        foreach (['esewa', 'khalti'] as $gateway) {
            $stats[$gateway] = Payment::selectRaw('
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as successful_transactions,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failed_transactions,
                COALESCE(SUM(CASE WHEN status = ? THEN amount ELSE 0 END), 0) as total_revenue
            ', ['success', 'failed', 'success'])
                ->where('gateway', $gateway)
                ->first();

            $total = $stats[$gateway]->total_transactions;
            $stats[$gateway] = [
                'total_transactions' => (int) $stats[$gateway]->total_transactions,
                'successful_transactions' => (int) $stats[$gateway]->successful_transactions,
                'failed_transactions' => (int) $stats[$gateway]->failed_transactions,
                'success_rate' => $total > 0 ? round(($stats[$gateway]->successful_transactions / $total) * 100, 2) : 0.0,
                'total_revenue' => (float) $stats[$gateway]->total_revenue,
            ];
        }

        return $stats;
    }

    /**
     * Build gateway order with primary and fallback.
     */
    protected function buildGatewayOrder(string $preferredGateway): array
    {
        $fallback = $preferredGateway === 'esewa' ? 'khalti' : 'esewa';

        return array_unique([$preferredGateway, $fallback]);
    }

    /**
     * Initiate specific gateway.
     */
    protected function initiateGateway(string $gateway, Order $order, array $customerDetails = []): array
    {
        return match($gateway) {
            'esewa' => $this->esewaService->initiatePayment($order),
            'khalti' => $this->khaltiService->initiatePayment($order, $customerDetails),
            default => ['success' => false, 'error' => 'Invalid gateway'],
        };
    }
}
