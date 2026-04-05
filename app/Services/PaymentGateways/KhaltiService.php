<?php

namespace App\Services\PaymentGateways;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Payment;
use App\Models\Order;
use Exception;

class KhaltiService
{
    protected string $publicKey;
    protected string $secretKey;
    protected string $apiUrl;
    protected string $webhookSecret;
    protected string $returnUrl;

    public function __construct()
    {
        $this->publicKey = config('services.khalti.public_key', env('KHALTI_PUBLIC_KEY', ''));
        $this->secretKey = config('services.khalti.secret_key', env('KHALTI_SECRET_KEY', ''));
        $this->apiUrl = rtrim(config('services.khalti.api_url', env('KHALTI_API_URL', 'https://a.khalti.com/api/v2/epayment')), '/');
        $this->webhookSecret = config('services.khalti.webhook_secret', env('KHALTI_WEBHOOK_SECRET', ''));
        $this->returnUrl = config('services.khalti.return_url', route('payment.khalti.callback', [], false));
    }

    /**
     * Initialize Khalti payment.
     */
    public function initiatePayment(Order $order, array $customerDetails = []): array
    {
        try {
            $transactionUuid = $this->generateTransactionUuid();

            $payment = Payment::create([
                'order_id' => $order->id,
                'gateway' => 'khalti',
                'transaction_id' => $transactionUuid,
                'amount' => $order->total,
                'currency' => 'NPR',
                'status' => 'pending',
            ]);

            $amountInPaisa = (int) round((float) $order->total * 100);

            $payload = [
                'return_url' => $this->returnUrl,
                'website_url' => config('app.url'),
                'amount' => $amountInPaisa,
                'purchase_order_id' => $transactionUuid,
                'purchase_order_name' => 'Order #' . $order->id,
                'customer_info' => [
                    'name' => $customerDetails['name'] ?? $order->customer_name ?? 'Customer',
                    'email' => $customerDetails['email'] ?? $order->customer_email ?? '',
                    'phone' => $customerDetails['phone'] ?? $order->customer_phone ?? '',
                ],
            ];

            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => 'Key ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl . '/initiate/', $payload);

            if ($response->successful()) {
                $data = $response->json();

                $payment->update([
                    'gateway_reference' => $data['pidx'] ?? null,
                    'gateway_response' => $data,
                ]);

                return [
                    'success' => true,
                    'payment_id' => $payment->id,
                    'transaction_uuid' => $transactionUuid,
                    'payment_url' => $data['payment_url'] ?? null,
                    'pidx' => $data['pidx'] ?? null,
                    'payment_method' => 'redirect',
                ];
            }

            Log::error('Khalti payment initiation failed', [
                'order_id' => $order->id,
                'response_status' => $response->status(),
                'response' => $response->json(),
            ]);

            return [
                'success' => false,
                'error' => 'Payment initiation failed',
            ];

        } catch (Exception $e) {
            Log::error('Khalti payment initiation error', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Payment initiation error',
            ];
        }
    }

    /**
     * Verify Khalti payment via lookup API.
     */
    public function verifyPayment(string $pidx): array
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => 'Key ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl . '/lookup/', [
                    'pidx' => $pidx,
                ]);

            if ($response->successful()) {
                $data = $response->json();

                if (isset($data['status']) && $data['status'] === 'Completed') {
                    $payment = Payment::where('gateway_reference', $pidx)
                        ->where('gateway', 'khalti')
                        ->first();

                    if ($payment !== null) {
                        $amountInRupees = ($data['total_amount'] ?? 0) / 100;

                        $payment->markAsSuccess($data, $pidx);

                        $payment->order?->markAsPaid();
                    }

                    return [
                        'success' => true,
                        'payment' => $payment,
                        'transaction_id' => $pidx,
                        'amount' => $amountInRupees,
                        'message' => 'Payment successful',
                    ];
                }
            }

            $payment = Payment::where('gateway_reference', $pidx)
                ->where('gateway', 'khalti')
                ->first();

            if ($payment !== null) {
                $payment->markAsFailed('Payment verification failed');
            }

            return [
                'success' => false,
                'error' => 'Payment verification failed',
                'payment' => $payment,
            ];

        } catch (Exception $e) {
            Log::error('Khalti payment verification failed', [
                'pidx' => $pidx,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Payment verification error',
            ];
        }
    }

    /**
     * Handle Khalti webhook/callback.
     */
    public function handleCallback(array $data): array
    {
        $pidx = $data['pidx'] ?? null;

        if ($pidx === null) {
            return [
                'success' => false,
                'error' => 'Missing pidx',
            ];
        }

        return $this->verifyPayment($pidx);
    }

    /**
     * Verify webhook signature.
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $expectedSignature = hash_hmac('sha256', $payload, $this->webhookSecret);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Process refund.
     */
    public function refund(Payment $payment, float $amount, ?string $reason = null): array
    {
        try {
            if ($payment->gateway_reference === null) {
                return [
                    'success' => false,
                    'error' => 'Missing gateway reference',
                ];
            }

            $amountInPaisa = (int) round($amount * 100);

            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => 'Key ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl . '/refund/', [
                    'pidx' => $payment->gateway_reference,
                    'amount' => $amountInPaisa,
                    'reason' => $reason ?? 'Customer requested',
                ]);

            if ($response->successful()) {
                $result = $response->json();

                $payment->update([
                    'status' => 'refunded',
                    'gateway_response' => array_merge(
                        $payment->gateway_response ?? [],
                        ['refund' => $result]
                    ),
                ]);

                return [
                    'success' => true,
                    'refund_id' => $result['refund_id'] ?? null,
                ];
            }

            return [
                'success' => false,
                'error' => 'Refund failed',
            ];

        } catch (Exception $e) {
            Log::error('Khalti refund failed', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Refund error',
            ];
        }
    }

    /**
     * Generate unique transaction UUID.
     */
    protected function generateTransactionUuid(): string
    {
        return 'KHL-' . strtoupper(Str::random(16));
    }

    /**
     * Get payment status.
     */
    public function getStatus(string $pidx): array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Key ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl . '/lookup/', [
                    'pidx' => $pidx,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'status' => $data['status'] ?? 'unknown',
                    'amount' => ($data['total_amount'] ?? 0) / 100,
                ];
            }

            return [
                'success' => false,
                'error' => 'Status check failed',
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
