'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Sparkles, Loader2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';

interface AIRecommendationsProps {
  type: 'fbt' | 'stl' | 'personalized' | 'upsell';
  productId?: number;
  limit?: number;
  title?: string;
}

interface Recommendation {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  category: string;
  primary_image_url: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

export default function AIRecommendations({
  type,
  productId,
  limit = 4,
  title,
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultTitles: Record<string, string> = {
    fbt: 'Frequently Bought Together',
    stl: 'Shop The Look',
    personalized: 'Recommended For You',
    upsell: 'Complete Your Look',
  };

  const displayTitle = title || defaultTitles[type] || 'Recommended Products';

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        let endpoint = '';

        switch (type) {
          case 'fbt':
            endpoint = productId ? `/products/${productId}/frequently-bought-together` : '/products/recommendations?type=fbt';
            break;
          case 'stl':
            endpoint = productId ? `/products/${productId}/shop-the-look` : '/products/recommendations?type=stl';
            break;
          case 'personalized':
            endpoint = '/products/recommendations?type=personalized';
            break;
          case 'upsell':
            endpoint = '/products/recommendations?type=upsell';
            break;
        }

        const response = await fetch(`${API_URL}${endpoint}`);

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        setRecommendations(data.slice(0, limit));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load recommendations';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [type, productId, limit]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading recommendations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail - recommendations are non-critical
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-nepal-red" />
        <h2 className="text-2xl font-bold">{displayTitle}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recommendations.map((rec) => (
          <ProductCard key={rec.id} product={rec} />
        ))}
      </div>
    </div>
  );
}
