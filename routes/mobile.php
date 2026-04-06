<?php

use Illuminate\Routing\Router;
use App\Http\Controllers\Api\Mobile\CartController;
use App\Http\Controllers\Api\Mobile\FavoriteController;
use App\Http\Controllers\Api\Mobile\ProfileController;

return static function (Router $router) {
    $router->prefix('mobile')->group(function () use ($router) {

        // Cart routes
        $router->prefix('cart')->group(function () use ($router) {
            $router->get('/', [CartController::class, 'index']);
            $router->post('/', [CartController::class, 'store']);
            $router->put('/{id}', [CartController::class, 'update']);
            $router->delete('/{id}', [CartController::class, 'destroy']);
            $router->delete('/', [CartController::class, 'clear']);
        });

        // Favorite routes
        $router->prefix('favorites')->group(function () use ($router) {
            $router->get('/', [FavoriteController::class, 'index']);
            $router->post('/', [FavoriteController::class, 'store']);
            $router->delete('/{productId}', [FavoriteController::class, 'destroy']);
            $router->post('/toggle', [FavoriteController::class, 'toggle']);
        });

        // Profile routes
        $router->prefix('profile')->group(function () use ($router) {
            $router->get('/', [ProfileController::class, 'show']);
            $router->put('/', [ProfileController::class, 'update']);
            $router->post('/password', [ProfileController::class, 'updatePassword']);

            // Orders under profile
            $router->get('/orders', [ProfileController::class, 'orders']);
            $router->get('/orders/{orderId}', [ProfileController::class, 'orderDetail']);

            // Addresses under profile
            $router->get('/addresses', [ProfileController::class, 'addressesIndex']);
            $router->post('/addresses', [ProfileController::class, 'addressesStore']);
            $router->put('/addresses', [ProfileController::class, 'addressesUpdate']);
            $router->delete('/addresses', [ProfileController::class, 'addressesDestroy']);
        });
    });
};
