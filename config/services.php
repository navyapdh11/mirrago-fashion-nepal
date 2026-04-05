<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | Mirrago AI Virtual Try-On Configuration
    |--------------------------------------------------------------------------
    */
    'mirrago' => [
        'api_key' => env('MIRRAGO_API_KEY'),
        'base_url' => env('MIRRAGO_BASE_URL', 'https://api.mirrago.com/v1'),
        'webhook_secret' => env('MIRRAGO_WEBHOOK_SECRET'),
    ],

    /*
    |--------------------------------------------------------------------------
    | eSewa Payment Gateway Configuration
    |--------------------------------------------------------------------------
    */
    'esewa' => [
        'merchant_id' => env('ESEWA_MERCHANT_ID'),
        'secret_key' => env('ESEWA_SECRET_KEY'),
        'api_url' => env('ESEWA_API_URL', 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'),
        'verify_url' => env('ESEWA_VERIFY_URL', 'https://rc-epay.esewa.com.np/api/epay/transaction/details/'),
        'success_url' => env('ESEWA_SUCCESS_URL', env('APP_URL') . '/payment/success'),
        'failure_url' => env('ESEWA_FAILURE_URL', env('APP_URL') . '/payment/failed'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Khalti Payment Gateway Configuration
    |--------------------------------------------------------------------------
    */
    'khalti' => [
        'public_key' => env('KHALTI_PUBLIC_KEY'),
        'secret_key' => env('KHALTI_SECRET_KEY'),
        'api_url' => env('KHALTI_API_URL', 'https://a.khalti.com/api/v2/epayment'),
        'webhook_secret' => env('KHALTI_WEBHOOK_SECRET'),
        'return_url' => env('KHALTI_RETURN_URL', env('APP_URL') . '/payment/khalti/callback'),
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Recommendation Configuration
    |--------------------------------------------------------------------------
    */
    'ai' => [
        'recommendation_cache_ttl' => env('AI_RECOMMENDATION_CACHE_TTL', 3600),
        'model_api_key' => env('AI_MODEL_API_KEY'),
    ],

];
