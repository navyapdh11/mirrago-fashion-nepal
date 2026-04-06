<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::with('product')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        $products = $favorites->map(function (Favorite $favorite) {
            return new ProductResource($favorite->product);
        });

        return response()->json([
            'favorites' => $products,
            'count' => $favorites->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $product = Product::active()->findOrFail($validated['product_id']);

        $favorite = Favorite::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $validated['product_id'],
        ]);

        if (!$favorite->wasRecentlyCreated) {
            return response()->json([
                'message' => 'Already in favorites',
                'product' => new ProductResource($product),
            ], 200);
        }

        return response()->json([
            'message' => 'Added to favorites',
            'product' => new ProductResource($product),
        ], 201);
    }

    public function destroy(Request $request, int $productId): JsonResponse
    {
        $favorite = Favorite::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->firstOrFail();

        $favorite->delete();

        return response()->json(['message' => 'Removed from favorites']);
    }

    public function toggle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $favorite = Favorite::where('user_id', $request->user()->id)
            ->where('product_id', $validated['product_id'])
            ->first();

        if ($favorite !== null) {
            $favorite->delete();
            $isFavorite = false;
            $message = 'Removed from favorites';
        } else {
            $product = Product::active()->findOrFail($validated['product_id']);
            Favorite::create([
                'user_id' => $request->user()->id,
                'product_id' => $validated['product_id'],
            ]);
            $isFavorite = true;
            $message = 'Added to favorites';
        }

        return response()->json([
            'message' => $message,
            'is_favorite' => $isFavorite,
            'product_id' => $validated['product_id'],
        ]);
    }
}
