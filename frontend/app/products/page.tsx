import { api } from '@/lib/api';
import ProductGrid from '@/components/ProductGrid';
import { Suspense } from 'react';

interface ProductsPageProps {
  searchParams: {
    category?: string;
    brand?: string;
    search?: string;
    page?: string;
  };
}

export const metadata = {
  title: 'Products | Mirrago Fashion Nepal',
  description: 'Browse our collection of authentic Nepali fashion',
};

async function ProductsList({ searchParams }: ProductsPageProps) {
  const productsData = await api.products.list({
    category: searchParams.category,
    brand: searchParams.brand,
    search: searchParams.search,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    per_page: 12,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-nepal-blue mb-2">
          {searchParams.category ? `${searchParams.category}'s Collection` : 'All Products'}
        </h1>
        <p className="text-gray-600">
          {productsData.total} product{productsData.total !== 1 ? 's' : ''} found
        </p>
      </div>
      {productsData.data.length > 0 ? (
        <ProductGrid products={productsData.data} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <ProductsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
