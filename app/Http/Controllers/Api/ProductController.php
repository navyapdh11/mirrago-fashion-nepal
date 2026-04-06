<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\AIRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        protected AIRecommendationService $recommendationService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        \Log::info('Product index called');
        $query = Product::query()->active();
        \Log::info('Product count before filters: ' . $query->count());

        if ($request->filled('category')) {
            $query->byCategory($request->string('category'));
        }

        if ($request->filled('brand')) {
            $query->where('brand', $request->string('brand'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->search($search);
        }

        $perPage = $request->integer('per_page', 20);
        $products = $query->paginate(min($perPage, 100));

        return response()->json($products);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::active()->where('slug', $slug)->firstOrFail();
        $variants = $product->variants()->active()->get();

        return response()->json([
            'product' => $product,
            'variants' => $variants,
        ]);
    }

    public function trending(Request $request): JsonResponse
    {
        $limit = $request->integer('limit', 10);
        $products = Product::active()->trending(min($limit, 50))->get();

        return response()->json($products);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        $sessionId = $request->session()->getId();

        $recommendations = $this->recommendationService->getPersonalizedRecommendations(
            $userId,
            $sessionId
        );

        return response()->json($recommendations);
    }

    public function frequentlyBoughtTogether(int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $recommendations = $this->recommendationService->getFrequentlyBoughtTogether($product);

        return response()->json($recommendations);
    }

    public function shopTheLook(int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $recommendations = $this->recommendationService->getShopTheLook($product);

        return response()->json($recommendations);
    }
}
