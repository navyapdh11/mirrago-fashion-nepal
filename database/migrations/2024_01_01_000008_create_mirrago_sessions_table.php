<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mirrago_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('session_id')->unique();
            $table->string('status')->default('processing'); // processing, completed, failed
            $table->string('result_url')->nullable();
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('converted')->default(false);
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mirrago_sessions');
    }
};
