<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\MirragoController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\AuthController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication routes (public)
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Public product routes
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/trending', [ProductController::class, 'trending']);
Route::get('/products/{slug}', [ProductController::class, 'show'])->name('products.show');

// Product recommendations (public with fallback)
Route::get('/products/{id}/frequently-bought-together', [ProductController::class, 'frequentlyBoughtTogether']);
Route::get('/products/{id}/shop-the-look', [ProductController::class, 'shopTheLook']);
Route::get('/products/recommendations', [ProductController::class, 'recommendations']);

// Inventory (public read)
Route::get('/inventory', [InventoryController::class, 'index']);
Route::get('/inventory/variant/{productVariantId}/stock', [InventoryController::class, 'checkStock']);
Route::get('/inventory/warehouses', [InventoryController::class, 'warehouses']);
Route::get('/inventory/warehouses/{city}/priority', [InventoryController::class, 'warehousePriority']);

// Mirrago AI Virtual Try-On (public)
Route::post('/mirrago/try-on/{productSlug}', [MirragoController::class, 'tryOn']);
Route::get('/mirrago/status/{sessionId}', [MirragoController::class, 'tryOnStatus']);
Route::post('/mirrago/webhook', [MirragoController::class, 'webhook']);
Route::get('/mirrago/deep-link/{productSlug}', [MirragoController::class, 'deepLink']);

// Payment callbacks (public - called by gateways)
Route::post('/payments/esewa/callback', [PaymentController::class, 'esewaCallback'])->name('payment.esewa.callback');
Route::post('/payments/khalti/webhook', [PaymentController::class, 'khaltiWebhook'])->name('payment.khalti.callback');

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Orders
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    // Payments
    Route::post('/payments/initiate', [PaymentController::class, 'initiate']);
    Route::get('/payments/verify/{orderId}', [PaymentController::class, 'verify']);
    Route::get('/payments/stats', [PaymentController::class, 'stats']);

    // Inventory management (admin)
    Route::post('/inventory/sync', [InventoryController::class, 'syncStock']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStockAlerts']);

    // Mirrago (authenticated)
    Route::post('/mirrago/track-conversion', [MirragoController::class, 'trackConversion']);
    Route::get('/mirrago/stats', [MirragoController::class, 'stats']);

    // User recommendations (authenticated for better results)
    Route::get('/user/recommendations', [ProductController::class, 'recommendations']);
});

/*
|--------------------------------------------------------------------------
| Mobile API Routes
|--------------------------------------------------------------------------
*/

$registerMobileRoutes = require __DIR__.'/mobile.php';
$registerMobileRoutes(Route::getFacadeRoot());
