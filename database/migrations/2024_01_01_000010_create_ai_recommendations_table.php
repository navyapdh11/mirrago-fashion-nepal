<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('recommendation_type'); // frequently_bought_together, shop_the_look, personalized, cart_upsell
            $table->json('product_ids'); // Array of recommended product IDs
            $table->json('metadata')->nullable(); // Context about why these were recommended
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'recommendation_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_recommendations');
    }
};
