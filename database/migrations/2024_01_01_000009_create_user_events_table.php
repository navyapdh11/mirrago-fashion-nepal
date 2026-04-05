<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('session_id')->nullable();
            $table->string('event_type'); // view, purchase, add_to_cart
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('event_timestamp')->useCurrent();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'event_type']);
            $table->index(['session_id', 'event_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_events');
    }
};
