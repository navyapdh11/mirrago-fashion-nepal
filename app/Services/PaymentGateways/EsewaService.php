<?php

namespace App\Services\PaymentGateways;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Payment;
use App\Models\Order;
use Exception;

class EsewaService
{
    protected string $merchantId;
    protected string $secretKey;
    protected string $apiUrl;
    protected string $verifyUrl;
    protected string $successUrl;
    protected string $failureUrl;

    public function __construct()
    {
        $this->merchantId = config('services.esewa.merchant_id', env('ESEWA_MERCHANT_ID', ''));
        $this->secretKey = config('services.esewa.secret_key', env('ESEWA_SECRET_KEY', ''));
        $this->apiUrl = rtrim(config('services.esewa.api_url', env('ESEWA_API_URL', 'https://rc-epay.esewa.com.np')), '/');
        $this->verifyUrl = rtrim(config('services.esewa.verify_url', env('ESEWA_VERIFY_URL', 'https://rc-epay.esewa.com.np/api/epay/transaction/details/')), '/');
        $this->successUrl = config('services.esewa.success_url', route('payment.success'));
        $this->failureUrl = config('services.esewa.failure_url', route('payment.failed'));
    }

    /**
     * Initialize eSewa payment.
     */
    public function initiatePayment(Order $order): array
    {
        try {
            $transactionUuid = $this->generateTransactionUuid();

            $payment = Payment::create([
                'order_id' => $order->id,
                'gateway' => 'esewa',
                'transaction_id' => $transactionUuid,
                'amount' => $order->total,
                'currency' => 'NPR',
                'status' => 'pending',
            ]);

            $totalAmount = number_format((float) $order->total, 2, '.', '');

            $requestPayload = [
                'amount' => number_format((float) ($order->subtotal ?? $order->total), 2, '.', ''),
                'tax_amount' => number_format((float) ($order->tax ?? 0), 2, '.', ''),
                'total_amount' => $totalAmount,
                'transaction_uuid' => $transactionUuid,
                'product_code' => $this->merchantId,
                'product_service_charge' => '0',
                'product_delivery_charge' => number_format((float) ($order->shipping_cost ?? 0), 2, '.', ''),
                'success_url' => $this->successUrl,
                'failure_url' => $this->failureUrl,
                'signed_field_names' => 'total_amount,transaction_uuid,product_code',
            ];

            $signatureString = sprintf(
                'total_amount=%s,transaction_uuid=%s,product_code=%s',
                $requestPayload['total_amount'],
                $requestPayload['transaction_uuid'],
                $requestPayload['product_code']
            );

            $signature = base64_encode(
                hash_hmac('sha256', $signatureString, $this->secretKey, true)
            );

            $requestPayload['signature'] = $signature;

            $payment->update([
                'gateway_response' => $requestPayload,
                'gateway_reference' => $transactionUuid,
            ]);

            return [
                'success' => true,
                'payment_id' => $payment->id,
                'transaction_uuid' => $transactionUuid,
                'payment_url' => $this->verifyUrl,
                'payload' => $requestPayload,
                'payment_method' => 'redirect',
            ];

        } catch (Exception $e) {
            Log::error('eSewa payment initiation failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Payment initiation failed',
            ];
        }
    }

    /**
     * Verify eSewa payment via API.
     */
    public function verifyPayment(array $data): array
    {
        try {
            $encodedData = json_encode([
                'product_code' => $this->merchantId,
                'total_amount' => $data['total_amount'] ?? '0',
                'transaction_uuid' => $data['transaction_uuid'] ?? '',
            ]);

            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl, [
                    'data' => base64_encode($encodedData),
                ]);

            if ($response->successful()) {
                $result = $response->json();

                if (isset($result['status']) && $result['status'] === 'COMPLETE') {
                    $payment = Payment::where('transaction_id', $data['transaction_uuid'])
                        ->where('gateway', 'esewa')
                        ->first();

                    if ($payment !== null) {
                        $payment->markAsSuccess($result, $result['reference_id'] ?? $data['transaction_uuid']);

                        $payment->order?->markAsPaid();
                    }

                    return [
                        'success' => true,
                        'payment' => $payment,
                        'transaction_id' => $result['reference_id'] ?? $data['transaction_uuid'],
                        'message' => 'Payment successful',
                    ];
                }
            }

            $payment = Payment::where('transaction_id', $data['transaction_uuid'] ?? '')
                ->where('gateway', 'esewa')
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
            Log::error('eSewa payment verification failed', [
                'error' => $e->getMessage(),
                'data' => $data,
            ]);

            return [
                'success' => false,
                'error' => 'Payment verification error',
            ];
        }
    }

    /**
     * Handle eSewa webhook/callback.
     */
    public function handleCallback(array $data, string $signature): array
    {
        $decodedData = json_decode(base64_decode($data['data'] ?? ''), true);

        if ($decodedData === null) {
            return [
                'success' => false,
                'error' => 'Invalid callback data',
            ];
        }

        // Verify signature
        $expectedSignature = base64_encode(
            hash_hmac('sha256', $data['data'], $this->secretKey, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return [
                'success' => false,
                'error' => 'Invalid signature',
            ];
        }

        return $this->verifyPayment($decodedData);
    }

    /**
     * Process refund.
     */
    public function refund(Payment $payment, float $amount, ?string $reason = null): array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->secretKey,
                ])
                ->post($this->apiUrl . '/refund', [
                    'transaction_id' => $payment->transaction_id,
                    'amount' => number_format($amount, 2, '.', ''),
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
            Log::error('eSewa refund failed', [
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
        return 'ESE-' . Str::uuid()->toString();
    }

    /**
     * Get payment status.
     */
    public function getStatus(string $transactionUuid): array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl . '/transaction/status', [
                    'transaction_uuid' => $transactionUuid,
                    'product_code' => $this->merchantId,
                ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'status' => $response->json()['status'] ?? 'unknown',
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
