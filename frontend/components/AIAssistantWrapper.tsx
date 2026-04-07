// AI Assistant Wrapper - Client component that fetches products for the AI agent
'use client';

import React, { useEffect, useState } from 'react';
import AIAssistant from './AIAssistant';
import { AgentProvider } from '@/context/AgentContext';
import { api } from '@/lib/api';
import type { Product } from '@/lib/agent/types';

export default function AIAssistantWrapper() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.products.list({ per_page: 50 })
      .then(res => setProducts(res.data || []))
      .catch(err => console.error('Failed to fetch products for AI assistant:', err));
  }, []);

  const handleProductClick = (productId: string) => {
    window.location.href = `/products/${productId}`;
  };

  return (
    <AgentProvider products={products}>
      <AIAssistant products={products} onProductClick={handleProductClick} />
    </AgentProvider>
  );
}
