import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const discount = product.compare_price 
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) 
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {product.primary_image_url ? (
            <Image
              src={product.primary_image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-4xl">👕</span>
            </div>
          )}
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-nepal-red text-white text-xs font-bold px-2 py-1 rounded">
              -{discount}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-nepal-blue font-medium uppercase mb-1">
            {product.category}
          </p>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-nepal-red transition">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-nepal-red">
              NPR {product.price.toLocaleString()}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-sm text-gray-500 line-through">
                NPR {product.compare_price.toLocaleString()}
              </span>
            )}
          </div>
          {product.style_tags && product.style_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.style_tags.slice(0, 2).map((tag: string, i: number) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
