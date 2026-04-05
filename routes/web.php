<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return view('welcome');
});

Route::get('/payment/success', function () {
    return view('payment.success');
})->name('payment.success');

Route::get('/payment/failed', function () {
    return view('payment.failed');
})->name('payment.failed');
