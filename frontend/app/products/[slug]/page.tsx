import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import VirtualTryOn from '@/components/VirtualTryOn';
import ProductRecommendations from '@/components/ProductRecommendations';
import ProductClient from './ProductClient';

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

        {/* Details - Client Component */}
        <ProductClient
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
