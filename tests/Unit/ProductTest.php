<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\InventoryLevel;

class ProductTest extends TestCase
{
    public function test_product_has_discount(): void
    {
        $product = new Product();
        $product->price = 100.00;
        $product->compare_price = 150.00;

        $this->assertTrue($product->hasDiscount());
        $this->assertEquals(33.33, $product->discount_percentage);
    }

    public function test_product_no_discount(): void
    {
        $product = new Product();
        $product->price = 100.00;
        $product->compare_price = null;

        $this->assertFalse($product->hasDiscount());
        $this->assertEquals(0.0, $product->discount_percentage);
    }

    public function test_product_image_url_fallback(): void
    {
        $product = new Product();
        $product->primary_image_url = null;

        $this->assertEquals('/images/placeholder.png', $product->image_url);
    }
}
