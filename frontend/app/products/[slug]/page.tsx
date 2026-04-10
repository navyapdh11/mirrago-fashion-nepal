'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import VirtualTryOn from '@/components/VirtualTryOn';
import ProductRecommendations from '@/components/ProductRecommendations';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const { product } = await api.products.get(params.slug);
    return {
      title: `${product.name} | Mirrago Fashion Nepal`,
      description: product.description || `Buy ${product.name} from Mirrago Fashion Nepal`,
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  let productData: any;

  try {
    productData = await api.products.get(params.slug);
  } catch {
    notFound();
  }

  const { product, variants } = productData;
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link href="/products" className="inline-flex items-center gap-2 text-nepal-blue hover:text-nepal-red mb-8 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
          {product.primary_image_url ? (
            <Image
              src={product.primary_image_url}
              alt={product.name || 'Product image'}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-8xl" role="img" aria-label="Product placeholder">👕</span>
            </div>
          )}
          {discount > 0 && (
            <div className="absolute top-4 right-4 bg-nepal-red text-white font-bold px-3 py-2 rounded-lg">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Details */}
        <ProductDetails
          product={product}
          variants={variants}
          discount={discount}
        />
      </div>

      {/* AI Recommendations */}
      <ProductRecommendations
        productId={product.id}
        productSlug={product.slug}
        category={product.category}
      />
    </div>
  );
}

// Client component for interactive features
function ProductDetails({ product, variants, discount }: {
  product: any;
  variants: any[];
  discount: number;
}) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(
    variants.length === 1 ? variants[0].size : null
  );
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.primary_image_url,
      size: selectedSize,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div>
      <p className="text-nepal-blue font-medium uppercase mb-2">{product.category}</p>
      <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
      <p className="text-gray-600 mb-6">{product.description}</p>

      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-3xl font-bold text-nepal-red">
          NPR {product.price.toLocaleString()}
        </span>
        {product.compare_price && product.compare_price > product.price && (
          <span className="text-xl text-gray-500 line-through">
            NPR {product.compare_price.toLocaleString()}
          </span>
        )}
      </div>

      {/* Variants */}
      {variants.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Available Sizes</h3>
          <div className="flex flex-wrap gap-2">
            {variants.map((v: any) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setSelectedSize(v.size)}
                className={`px-4 py-2 border-2 rounded hover:border-nepal-red hover:text-nepal-red transition ${
                  selectedSize === v.size
                    ? 'border-nepal-red bg-nepal-red text-white'
                    : 'border-gray-300'
                }`}
              >
                {v.size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {product.style_tags?.map((tag: string) => (
          <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
            {tag}
          </span>
        ))}
      </div>

      {/* Add to Cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        className="w-full bg-nepal-red text-white py-4 rounded-lg font-semibold hover:bg-nepal-crimson transition flex items-center justify-center gap-2 mb-3"
      >
        <ShoppingCart className="w-5 h-5" />
        {addedToCart ? '✓ Added to Cart!' : 'Add to Cart'}
      </button>

      {/* Virtual Try-On */}
      <VirtualTryOn
        productSlug={product.slug}
        productName={product.name}
        productImageUrl={product.primary_image_url}
      />

      {/* Meta */}
      <div className="mt-8 space-y-2 text-sm text-gray-600">
        <p><strong>Brand:</strong> {product.brand || 'N/A'}</p>
        <p><strong>Color:</strong> {product.color || 'N/A'}</p>
        <p><strong>SKU:</strong> {product.sku}</p>
      </div>
    </div>
  );
}
