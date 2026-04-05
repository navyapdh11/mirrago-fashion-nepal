<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\MirragoSession;
use App\Services\MirragoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MirragoController extends Controller
{
    public function __construct(
        protected MirragoService $mirragoService,
    ) {
    }

    public function tryOn(Request $request, string $productSlug): JsonResponse
    {
        $product = Product::active()->where('slug', $productSlug)->firstOrFail();

        $validated = $request->validate([
            'user_photo_base64' => ['nullable', 'string'],
        ]);

        $result = $this->mirragoService->generateTryOn(
            $product,
            $validated['user_photo_base64'] ?? null
        );

        return response()->json($result);
    }

    public function tryOnStatus(string $sessionId): JsonResponse
    {
        $result = $this->mirragoService->getTryOnResult($sessionId);

        return response()->json($result);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Mirrago-Signature', '');

        if (!$this->mirragoService->verifyWebhookSignature($payload, $signature)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = $request->all();

        $session = MirragoSession::where('session_id', $data['session_id'] ?? '')->first();

        if ($session !== null) {
            if ($data['status'] === 'ready') {
                $session->markAsCompleted($data['tryon_image'] ?? '');
            } elseif ($data['status'] === 'failed') {
                $session->markAsFailed($data['error_message'] ?? 'Unknown error');
            }
        }

        return response()->json(['status' => 'ok']);
    }

    public function trackConversion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => ['required', 'string', 'exists:mirrago_sessions,session_id'],
            'purchased' => ['required', 'boolean'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
        ]);

        $this->mirragoService->trackConversion(
            $validated['session_id'],
            $validated['purchased'],
            $validated['order_id'] ?? null
        );

        return response()->json(['message' => 'Conversion tracked']);
    }

    public function stats(Request $request): JsonResponse
    {
        $productId = $request->integer('product_id');
        $stats = $this->mirragoService->getSessionStats($productId !== 0 ? $productId : null);

        return response()->json($stats);
    }

    public function deepLink(string $productSlug): JsonResponse
    {
        $product = Product::active()->where('slug', $productSlug)->firstOrFail();
        $color = request()->get('color', 'default');

        $deepLink = $this->mirragoService->getDeepLink($product, $color);

        return response()->json(['deep_link' => $deepLink]);
    }
}
