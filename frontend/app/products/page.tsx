'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/ProductGrid';
import { api } from '@/lib/api';
import { Loader2, Filter } from 'lucide-react';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';

  const fetchProducts = useCallback(() => {
    setLoading(true);
    api.products
      .list({
        category: category || undefined,
        search: search || undefined,
        page,
        per_page: 12,
      })
      .then((res) => {
        setProducts(res.data || []);
        setTotal(res.total || 0);
        setLastPage(res.last_page || 1);
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });
  }, [category, search, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const title = category ? `${category}'s Collection` : 'All Products';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-nepal-blue mb-2">
            {title}
          </h1>
          {search && <p className="text-gray-600">Results for &quot;{search}&quot;</p>}
          {total > 0 && (
            <p className="text-gray-600">
              {total} product{total !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:border-nepal-red hover:text-nepal-red transition">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-nepal-red animate-spin mb-4" />
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <>
          <ProductGrid products={products} />
          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:border-nepal-red disabled:hover:border-gray-300 transition"
              >
                ← Previous
              </button>
              {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg font-medium transition ${
                    p === page
                      ? 'bg-nepal-red text-white'
                      : 'border border-gray-300 hover:border-nepal-red'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:border-nepal-red disabled:hover:border-gray-300 transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">👗</p>
          <p className="text-gray-500 text-lg mb-2">
            {search ? `No products found for "${search}"` : 'No products available'}
          </p>
          <p className="text-gray-400 text-sm">
            Products will appear once the backend API is connected.
          </p>
        </div>
      )}
    </div>
  );
}
