<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Order;
use App\Models\Product;
use App\Models\MirragoSession;
use Throwable;

class MirragoService
{
    protected string $apiKey;
    protected string $baseUrl;
    protected string $webhookSecret;

    public function __construct()
    {
        $this->apiKey = config('services.mirrago.api_key', env('MIRRAGO_API_KEY', ''));
        $this->baseUrl = rtrim(config('services.mirrago.base_url', env('MIRRAGO_BASE_URL', 'https://api.mirrago.com/v1')), '/');
        $this->webhookSecret = config('services.mirrago.webhook_secret', env('MIRRAGO_WEBHOOK_SECRET', ''));
    }

    /**
     * Generate AI Virtual Try-On for product.
     */
    public function generateTryOn(Product $product, ?string $userPhotoBase64 = null): array
    {
        $payload = [
            'product_image_url' => $product->primary_image_url ?? $product->getImageUrl(),
            'product_sku' => $product->sku,
            'product_name' => $product->name,
            'color' => $product->color ?? 'default',
            'user_avatar' => $userPhotoBase64,
            'metadata' => [
                'brand' => config('app.name'),
                'ref' => route('products.show', $product->slug),
                'customer_location' => request()->header('X-Customer-City', 'Kathmandu'),
            ],
        ];

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/tryon/init", $payload);

            if ($response->successful()) {
                $data = $response->json();

                MirragoSession::create([
                    'product_id' => $product->id,
                    'session_id' => $data['session_id'] ?? '',
                    'status' => 'processing',
                    'metadata' => $payload['metadata'],
                ]);

                return [
                    'success' => true,
                    'session_id' => $data['session_id'] ?? '',
                    'status' => $data['status'] ?? 'processing',
                    'estimated_time' => $data['estimated_time'] ?? 3,
                ];
            }

            Log::error('Mirrago VTO generation failed', [
                'product_sku' => $product->sku,
                'error' => $response->json(),
                'status' => $response->status(),
            ]);

            return ['success' => false, 'error' => 'VTO generation failed'];
        } catch (Throwable $e) {
            Log::error('Mirrago VTO HTTP error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Service unavailable'];
        }
    }

    /**
     * Poll for VTO result.
     */
    public function getTryOnResult(string $sessionId): array
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                ])
                ->get("{$this->baseUrl}/tryon/result/{$sessionId}");

            if ($response->successful()) {
                $data = $response->json();

                if ($data['status'] === 'ready') {
                    $session = MirragoSession::where('session_id', $sessionId)->first();
                    $session?->markAsCompleted($data['tryon_image'] ?? '');
                } elseif ($data['status'] === 'failed') {
                    $session = MirragoSession::where('session_id', $sessionId)->first();
                    $session?->markAsFailed($data['error_message'] ?? 'Unknown error');
                }

                return [
                    'success' => true,
                    'status' => $data['status'],
                    'tryon_image' => $data['tryon_image'] ?? null,
                    'error_message' => $data['error_message'] ?? null,
                ];
            }

            return ['success' => false, 'error' => 'Result fetch failed'];
        } catch (Throwable $e) {
            Log::error('Mirrago result fetch error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Service unavailable'];
        }
    }

    /**
     * Track VTO-to-purchase conversion.
     */
    public function trackConversion(string $sessionId, bool $purchased, ?int $orderId = null): void
    {
        try {
            Http::timeout(10)
                ->post("{$this->baseUrl}/analytics", [
                    'session_id' => $sessionId,
                    'purchase' => $purchased,
                    'timestamp' => now()->toIso8601String(),
                ]);

            $session = MirragoSession::where('session_id', $sessionId)->first();
            $session?->trackConversion($purchased, $orderId);

            Log::info('Mirrago conversion tracked', [
                'session_id' => $sessionId,
                'purchased' => $purchased,
                'order_id' => $orderId,
            ]);
        } catch (Throwable $e) {
            Log::error('Mirrago conversion tracking failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Generate deep link for mobile app.
     */
    public function getDeepLink(Product $product, string $color): string
    {
        return "mirrago://try?product={$product->slug}&color={$color}&ref=" .
            urlencode(route('products.show', $product->slug));
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
     * Get VTO session statistics.
     */
    public function getSessionStats(?int $productId = null): array
    {
        $query = MirragoSession::query();

        if ($productId !== null) {
            $query->where('product_id', $productId);
        }

        $total = $query->count();
        $completed = (clone $query)->where('status', 'completed')->count();
        $failed = (clone $query)->where('status', 'failed')->count();
        $converted = (clone $query)->where('converted', true)->count();

        return [
            'total_sessions' => $total,
            'completed_sessions' => $completed,
            'failed_sessions' => $failed,
            'converted_sessions' => $converted,
            'conversion_rate' => $total > 0 ? round(($converted / $total) * 100, 2) : 0.0,
            'avg_processing_time' => 3,
        ];
    }
}
