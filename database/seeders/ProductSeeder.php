<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\InventoryLevel;
use App\Models\Warehouse;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $warehouses = Warehouse::all();

        $products = [
            [
                'name' => 'Traditional Dhaka Topi',
                'slug' => 'traditional-dhaka-topi',
                'sku' => 'DT-001',
                'description' => 'Classic Nepali Dhaka topi, handwoven with traditional patterns',
                'category' => 'Accessories',
                'subcategory' => 'Headwear',
                'brand' => 'Nepali Heritage',
                'color' => 'Multi',
                'price' => 850.00,
                'compare_price' => 1200.00,
                'primary_image_url' => 'https://example.com/images/dhaka-topi.jpg',
                'style_tags' => json_encode(['traditional', 'ethnic', 'formal']),
                'occasion_tags' => json_encode(['festival', 'wedding', 'office']),
            ],
            [
                'name' => "Men's Classic Daura Suruwal",
                'slug' => 'mens-classic-daura-suruwal',
                'sku' => 'DS-002',
                'description' => 'Official national dress of Nepal, perfect for formal occasions',
                'category' => 'Men',
                'subcategory' => 'Ethnic Wear',
                'brand' => 'Nepali Heritage',
                'color' => 'White',
                'price' => 3500.00,
                'compare_price' => 4500.00,
                'primary_image_url' => 'https://example.com/images/daura-suruwal.jpg',
                'style_tags' => json_encode(['traditional', 'formal', 'ethnic']),
                'occasion_tags' => json_encode(['wedding', 'festival', 'office', 'ceremony']),
            ],
            [
                'name' => "Women's Kurtha Suruwal Set",
                'slug' => 'womens-kurtha-suruwal-set',
                'sku' => 'KS-003',
                'description' => 'Elegant kurtha suruwal with beautiful embroidery',
                'category' => 'Women',
                'subcategory' => 'Ethnic Wear',
                'brand' => 'Himalayan Fashion',
                'color' => 'Red',
                'price' => 2800.00,
                'compare_price' => 3500.00,
                'primary_image_url' => 'https://example.com/images/kurtha-suruwal.jpg',
                'style_tags' => json_encode(['traditional', 'elegant', 'embroidered']),
                'occasion_tags' => json_encode(['festival', 'wedding', 'party']),
            ],
            [
                'name' => 'Casual Denim Jacket',
                'slug' => 'casual-denim-jacket',
                'sku' => 'DJ-004',
                'description' => 'Trendy denim jacket for casual outings',
                'category' => 'Men',
                'subcategory' => 'Jackets',
                'brand' => 'Urban Style',
                'color' => 'Blue',
                'price' => 2200.00,
                'compare_price' => 2800.00,
                'primary_image_url' => 'https://example.com/images/denim-jacket.jpg',
                'style_tags' => json_encode(['casual', 'trendy', 'western']),
                'occasion_tags' => json_encode(['casual', 'outing', 'date']),
            ],
            [
                'name' => "Women's Saree - Silk Collection",
                'slug' => 'womens-saree-silk',
                'sku' => 'SR-005',
                'description' => 'Beautiful silk saree with intricate border design',
                'category' => 'Women',
                'subcategory' => 'Sarees',
                'brand' => 'Silk Palace',
                'color' => 'Gold',
                'price' => 4500.00,
                'compare_price' => 5500.00,
                'primary_image_url' => 'https://example.com/images/silk-saree.jpg',
                'style_tags' => json_encode(['elegant', 'traditional', 'luxury']),
                'occasion_tags' => json_encode(['wedding', 'festival', 'party']),
            ],
            [
                'name' => "Men's T-Shirt - Nepal Print",
                'slug' => 'mens-tshirt-nepal-print',
                'sku' => 'TS-006',
                'description' => 'Cotton t-shirt with Nepal-themed graphic print',
                'category' => 'Men',
                'subcategory' => 'T-Shirts',
                'brand' => 'Urban Style',
                'color' => 'Black',
                'price' => 750.00,
                'compare_price' => 999.00,
                'primary_image_url' => 'https://example.com/images/nepal-tshirt.jpg',
                'style_tags' => json_encode(['casual', 'trendy', 'graphic']),
                'occasion_tags' => json_encode(['casual', 'daily']),
            ],
            [
                'name' => "Women's Lehenga Choli",
                'slug' => 'womens-lehenga-choli',
                'sku' => 'LC-007',
                'description' => 'Designer lehenga choli with mirror work and embroidery',
                'category' => 'Women',
                'subcategory' => 'Lehengas',
                'brand' => 'Silk Palace',
                'color' => 'Maroon',
                'price' => 6500.00,
                'compare_price' => 8000.00,
                'primary_image_url' => 'https://example.com/images/lehenga-choli.jpg',
                'style_tags' => json_encode(['luxury', 'traditional', 'bridal']),
                'occasion_tags' => json_encode(['wedding', 'festival']),
            ],
            [
                'name' => "Men's Formal Pants",
                'slug' => 'mens-formal-pants',
                'sku' => 'FP-008',
                'description' => 'Slim fit formal pants for office and formal events',
                'category' => 'Men',
                'subcategory' => 'Pants',
                'brand' => 'Urban Style',
                'color' => 'Black',
                'price' => 1500.00,
                'compare_price' => 1999.00,
                'primary_image_url' => 'https://example.com/images/formal-pants.jpg',
                'style_tags' => json_encode(['formal', 'classic', 'office']),
                'occasion_tags' => json_encode(['office', 'formal', 'ceremony']),
            ],
        ];

        foreach ($products as $productData) {
            $product = Product::create($productData);

            // Create variants for sizes
            foreach (['S', 'M', 'L', 'XL', 'XXL'] as $size) {
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'sku' => $product->sku . '-' . $size,
                    'size' => $size,
                    'color' => $product->color,
                    'price' => $product->price,
                    'image_url' => $product->primary_image_url,
                    'is_active' => true,
                ]);

                // Create inventory levels for each warehouse
                foreach ($warehouses as $warehouse) {
                    InventoryLevel::create([
                        'product_variant_id' => $variant->id,
                        'warehouse_id' => $warehouse->id,
                        'stock_qty' => rand(10, 100),
                        'reserved_qty' => 0,
                        'reorder_level' => 10,
                    ]);
                }
            }

            $this->command->info("Product created: {$product->name}");
        }

        $this->command->info('All products created with variants and inventory!');
    }
}
