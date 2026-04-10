'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Package, Shirt } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types';

interface ProductRecommendationsProps {
  productId: number;
  productSlug: string;
  category: string;
}

export default function ProductRecommendations({
  productId,
  productSlug,
  category,
}: ProductRecommendationsProps) {
  const [frequentlyBought, setFrequentlyBought] = useState<Product[]>([]);
  const [shopTheLook, setShopTheLook] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const [fbt, stl] = await Promise.all([
          api.ai.recommendations.getFrequentlyBoughtTogether(productId).catch(() => []),
          api.ai.recommendations.getShopTheLook(productId).catch(() => []),
        ]);

        setFrequentlyBought(fbt);
        setShopTheLook(stl);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [productId]);

  const handleAddToCart = (product: Product) => {
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.primary_image_url,
      size: null,
    });

    setAddedItems((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);

    // Track recommendation click
    api.ai.recommendations.track({
      event_type: 'recommendation_click',
      product_id: product.id,
      metadata: {
        source_product_id: productId,
        recommendation_type: 'frequently_bought_together',
      },
    }).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-lg" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasRecommendations = frequentlyBought.length > 0 || shopTheLook.length > 0;

  if (!hasRecommendations) {
    return null;
  }

  return (
    <div className="mt-16 space-y-12">
      {/* Frequently Bought Together */}
      {frequentlyBought.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="w-6 h-6 text-nepal-red" />
            <h2 className="text-2xl font-bold">Frequently Bought Together</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {frequentlyBought.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
                isAdded={addedItems.has(product.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Shop The Look */}
      {shopTheLook.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Shirt className="w-6 h-6 text-nepal-blue" />
            <h2 className="text-2xl font-bold">Shop The Look</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shopTheLook.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
                isAdded={addedItems.has(product.id)}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onAddToCart,
  isAdded,
  compact = false,
}: {
  product: Product;
  onAddToCart: () => void;
  isAdded: boolean;
  compact?: boolean;
}) {
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-100"
    >
      <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden relative">
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-nepal-red text-white text-xs font-bold px-2 py-1 rounded">
            {discount}% OFF
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className={`font-medium text-gray-900 line-clamp-1 group-hover:text-nepal-red transition ${compact ? 'text-sm' : ''}`}>
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mt-1">
          <span className={`font-bold text-nepal-red ${compact ? 'text-base' : 'text-lg'}`}>
            NPR {product.price.toLocaleString()}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-xs text-gray-500 line-through">
              NPR {product.compare_price.toLocaleString()}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAddToCart();
          }}
          className={`mt-2 w-full text-white rounded font-medium transition flex items-center justify-center gap-1 ${
            isAdded
              ? 'bg-green-600'
              : compact
              ? 'bg-nepal-blue hover:bg-nepal-darkblue text-sm py-1.5'
              : 'bg-nepal-red hover:bg-nepal-crimson py-2'
          }`}
        >
          {isAdded ? '✓ Added' : (
            <>
              <ShoppingCart className="w-4 h-4" />
              {compact ? 'Add' : 'Add to Cart'}
            </>
          )}
        </button>
      </div>
    </Link>
  );
}
