<?php

namespace App\Services;

use App\Models\Product;
use App\Models\UserEvent;
use App\Models\AiRecommendation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AIRecommendationService
{
    protected int $cacheTTL;

    public function __construct()
    {
        $this->cacheTTL = config('services.ai.recommendation_cache_ttl', 3600);
    }

    /**
     * Get "Frequently Bought Together" recommendations.
     * Uses co-purchase pattern analysis with fallback to AI style tag matching.
     */
    public function getFrequentlyBoughtTogether(Product $product, int $limit = 3): array
    {
        $cacheKey = "ai:fbt:{$product->id}";

        return Cache::remember($cacheKey, $this->cacheTTL, function () use ($product, $limit) {
            // Find products frequently purchased with this one
            $recommendations = DB::table('order_items as oi1')
                ->join('order_items as oi2', 'oi1.order_id', '=', 'oi2.order_id')
                ->join('products as p', 'oi2.product_id', '=', 'p.id')
                ->where('oi1.product_id', $product->id)
                ->where('p.id', '!=', $product->id)
                ->where('p.is_active', true)
                ->select(
                    'p.id',
                    'p.name',
                    'p.slug',
                    'p.price',
                    'p.primary_image_url',
                    'p.category',
                    DB::raw('COUNT(*) as frequency')
                )
                ->groupBy('p.id', 'p.name', 'p.slug', 'p.price', 'p.primary_image_url', 'p.category')
                ->orderByDesc('frequency')
                ->limit($limit)
                ->get();

            // Fallback to AI tags if no purchase history
            if ($recommendations->isEmpty()) {
                $styleTags = $product->style_tags ?? [];

                if (empty($styleTags)) {
                    return Product::active()
                        ->where('id', '!=', $product->id)
                        ->limit($limit)
                        ->get()
                        ->toArray();
                }

                return Product::active()
                    ->where('id', '!=', $product->id)
                    ->whereJsonOverlap('style_tags', $styleTags)
                    ->limit($limit)
                    ->get()
                    ->toArray();
            }

            return $recommendations->toArray();
        });
    }

    /**
     * Get "Shop the Look" (complete the outfit) recommendations.
     */
    public function getShopTheLook(Product $product, int $limit = 4): array
    {
        $cacheKey = "ai:shopthelook:{$product->id}";

        return Cache::remember($cacheKey, $this->cacheTTL, function () use ($product, $limit) {
            $complementaryCategories = $this->getComplementaryCategories($product->category ?? '');

            $query = Product::active()
                ->whereIn('category', $complementaryCategories);

            $occasionTags = $product->occasion_tags ?? [];
            if (!empty($occasionTags)) {
                $query->whereJsonOverlap('occasion_tags', $occasionTags);
            }

            return $query->limit($limit)->get()->toArray();
        });
    }

    /**
     * Get personalized homepage recommendations for user.
     * Uses collaborative filtering based on user view/purchase history.
     * Cold-start fallback uses trending products by location.
     */
    public function getPersonalizedRecommendations(?int $userId = null, ?string $sessionId = null, string $location = 'Kathmandu', int $limit = 8): array
    {
        $contextKey = $userId ?? $sessionId ?? 'guest';
        $cacheKey = "ai:personalized:{$contextKey}:{$location}";

        return Cache::remember($cacheKey, $this->cacheTTL, function () use ($userId, $sessionId, $location, $limit) {
            // Get user's viewed/purchased products
            $userProductIds = UserEvent::whereIn('event_type', ['view', 'purchase'])
                ->forUserOrSession($userId, $sessionId)
                ->orderByDesc('event_timestamp')
                ->limit(20)
                ->pluck('product_id');

            if ($userProductIds->isEmpty()) {
                // Cold start: trending in location
                return $this->getTrendingInLocation($location, $limit);
            }

            // Collaborative filtering: users who viewed X also viewed Y
            $recommendations = DB::table('user_events as ue1')
                ->join('user_events as ue2', 'ue1.session_id', '=', 'ue2.session_id')
                ->join('products as p', 'ue2.product_id', '=', 'p.id')
                ->whereIn('ue1.product_id', $userProductIds)
                ->whereNotIn('ue2.product_id', $userProductIds)
                ->where('p.is_active', true)
                ->select(
                    'p.id',
                    'p.name',
                    'p.slug',
                    'p.price',
                    'p.primary_image_url',
                    'p.category',
                    DB::raw('COUNT(DISTINCT ue1.session_id) as score')
                )
                ->groupBy('p.id', 'p.name', 'p.slug', 'p.price', 'p.primary_image_url', 'p.category')
                ->orderByDesc('score')
                ->limit($limit)
                ->get();

            // If still no recommendations, fallback to similar products
            if ($recommendations->isEmpty()) {
                return Product::active()
                    ->whereNotIn('id', $userProductIds)
                    ->orderByDesc('price')
                    ->limit($limit)
                    ->get()
                    ->toArray();
            }

            return $recommendations->toArray();
        });
    }

    /**
     * Get cart upsell recommendations.
     */
    public function getCartUpsellRecommendments(array $cartProductIds, ?int $userId = null, int $limit = 3): array
    {
        if (empty($cartProductIds)) {
            return [];
        }

        $cacheKey = 'ai:cart_upsell:' . md5(implode(',', $cartProductIds));

        return Cache::remember($cacheKey, 900, function () use ($cartProductIds, $limit) {
            $recommendations = DB::table('order_items as oi1')
                ->join('order_items as oi2', 'oi1.order_id', '=', 'oi2.order_id')
                ->join('products as p', 'oi2.product_id', '=', 'p.id')
                ->whereIn('oi1.product_id', $cartProductIds)
                ->whereNotIn('oi2.product_id', $cartProductIds)
                ->where('p.is_active', true)
                ->select(
                    'p.id',
                    'p.name',
                    'p.slug',
                    'p.price',
                    'p.primary_image_url',
                    DB::raw('COUNT(*) as frequency')
                )
                ->groupBy('p.id', 'p.name', 'p.slug', 'p.price', 'p.primary_image_url')
                ->orderByDesc('frequency')
                ->limit($limit)
                ->get();

            return $recommendations->toArray();
        });
    }

    /**
     * Track user event for AI learning.
     */
    public function trackEvent(?int $userId, ?string $sessionId, string $eventType, int $productId, array $metadata = []): void
    {
        UserEvent::create([
            'user_id' => $userId,
            'session_id' => $sessionId,
            'event_type' => $eventType,
            'product_id' => $productId,
            'event_timestamp' => now(),
            'metadata' => $metadata,
        ]);

        // Invalidate cache for this user/session
        $contextKey = $userId ?? $sessionId;
        if ($contextKey !== null) {
            $location = $metadata['location'] ?? 'Kathmandu';
            Cache::forget("ai:personalized:{$contextKey}:{$location}");
        }
    }

    /**
     * Get complementary categories for outfit building.
     */
    protected function getComplementaryCategories(string $category): array
    {
        $mapping = [
            'T-Shirts' => ['Jeans', 'Shorts', 'Jackets', 'Sneakers'],
            'Hoodies' => ['Jeans', 'Joggers', 'T-Shirts', 'Sneakers'],
            'Jackets' => ['T-Shirts', 'Hoodies', 'Jeans', 'Joggers'],
            'Jeans' => ['T-Shirts', 'Hoodies', 'Sneakers', 'Belts'],
            'Joggers' => ['T-Shirts', 'Hoodies', 'Sneakers'],
            'Shorts' => ['T-Shirts', 'Tank Tops', 'Sandals'],
            'Sneakers' => ['Jeans', 'Joggers', 'Shorts'],
            'Accessories' => ['T-Shirts', 'Jeans', 'Jackets'],
        ];

        return $mapping[$category] ?? ['T-Shirts', 'Jeans'];
    }

    /**
     * Get trending products in a specific location.
     */
    protected function getTrendingInLocation(string $location, int $limit): array
    {
        return Product::active()
            ->orderByDesc('price')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Clear recommendation cache for a context.
     */
    public function clearCache(string $contextType, int|string $contextId): void
    {
        Cache::forget("ai:fbt:{$contextId}");
        Cache::forget("ai:shopthelook:{$contextId}");

        if ($contextType === 'user' || $contextType === 'session') {
            // Clear pattern-based caches (in production, use tagged cache)
            Cache::flush();
        }
    }

    /**
     * Get recommendation analytics.
     */
    public function getAnalytics(?int $productId = null): array
    {
        $query = UserEvent::where('event_type', 'purchase');

        if ($productId !== null) {
            $query->where('product_id', $productId);
        }

        $totalPurchases = $query->count();
        $aiRecommendedPurchases = (clone $query)->where('metadata->ai_recommended', true)->count();

        return [
            'total_purchases' => $totalPurchases,
            'ai_recommended_purchases' => $aiRecommendedPurchases,
            'ai_recommendation_rate' => $totalPurchases > 0 ? round(($aiRecommendedPurchases / $totalPurchases) * 100, 2) : 0.0,
        ];
    }
}
