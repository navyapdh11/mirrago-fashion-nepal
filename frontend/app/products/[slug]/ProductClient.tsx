'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import VirtualTryOn from '@/components/VirtualTryOn';

export default function ProductClient({ product, variants, discount }: {
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
