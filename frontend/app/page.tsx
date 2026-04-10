'use client';

import { useEffect, useState } from 'react';
import ProductGrid from '@/components/ProductGrid';
import { api } from '@/lib/api';
import { ShoppingCart, Brain, Truck, Shirt } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.products
      .list({ per_page: 8 })
      .then((res) => {
        setProducts(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const features = [
    { icon: Brain, title: 'AI Virtual Try-On', desc: 'Try clothes virtually before buying' },
    { icon: ShoppingCart, title: 'Smart Cart', desc: 'AI-powered product recommendations' },
    { icon: Truck, title: 'Fast Delivery', desc: '5 warehouses across Nepal' },
    { icon: Shirt, title: 'Authentic Fashion', desc: 'Traditional & modern Nepali fashion' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-nepal-red to-nepal-blue text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-6xl mb-4">🇳🇵</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Mirrago Fashion Nepal
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-2xl mx-auto">
            Nepal&apos;s first AI-powered fashion e-commerce platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/products" className="bg-white text-nepal-red px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
              Shop Now
            </a>
            <a href="/products?category=Women" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-nepal-red transition">
              Women&apos;s Collection
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-nepal-blue">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition">
                <feature.icon className="w-12 h-12 mx-auto mb-4 text-nepal-red" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-nepal-blue">
            Featured Collection
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Discover authentic Nepali fashion with modern AI-powered shopping
          </p>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 animate-pulse">Loading products...</p>
            </div>
          ) : products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Products will appear once the backend API is connected.</p>
              <a href="/products" className="text-nepal-red font-semibold hover:underline">
                Browse all products →
              </a>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-nepal-blue text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience AI Fashion?</h2>
          <p className="text-lg opacity-90 mb-8">
            Try our virtual try-on feature and get personalized recommendations
          </p>
          <a href="/products" className="bg-nepal-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-nepal-crimson transition inline-block">
            Start Shopping
          </a>
        </div>
      </section>
    </div>
  );
}
