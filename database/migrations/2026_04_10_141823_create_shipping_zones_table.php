<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->id();
            $table->string('country');
            $table->string('zone_name');
            $table->string('zone_code')->unique();
            $table->integer('min_weight')->default(0); // grams
            $table->integer('max_weight')->default(50000); // grams
            $table->decimal('base_rate', 10, 2); // NPR
            $table->decimal('per_kg_rate', 10, 2)->default(0); // NPR per additional kg
            $table->integer('delivery_days_min')->default(1);
            $table->integer('delivery_days_max')->default(14);
            $table->boolean('is_active')->default(true);
            $table->json('included_states')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_zones');
    }
};
