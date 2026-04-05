<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->string('gateway'); // esewa, khalti
            $table->string('transaction_id')->unique();
            $table->string('gateway_reference')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('NPR');
            $table->string('status'); // pending, success, failed, refunded
            $table->json('gateway_response')->nullable();
            $table->string('failure_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
