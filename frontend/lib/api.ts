import type { Product, ProductVariant, Warehouse, InventoryLevel, User, Order, CartItem, PaginationData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

interface FetchOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function fetchAPI<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Public Product APIs
export const api = {
  products: {
    list: (params?: { category?: string; brand?: string; search?: string; per_page?: number; page?: number }) =>
      fetchAPI<PaginationData<Product>>(`/products?${new URLSearchParams(params as any).toString()}`),
    
    get: (slug: string) =>
      fetchAPI<{ product: Product; variants: ProductVariant[] }>(`/products/${slug}`),
    
    trending: (limit = 10) =>
      fetchAPI<Product[]>(`/products/trending?limit=${limit}`),
    
    recommendations: () =>
      fetchAPI<Product[]>(`/products/recommendations`),
  },
  
  inventory: {
    warehouses: () =>
      fetchAPI<Warehouse[]>(`/inventory/warehouses`),
    
    stock: (productVariantId: number) =>
      fetchAPI<InventoryLevel[]>(`/inventory/variant/${productVariantId}/stock`),
  },
  
  // Authentication
  auth: {
    register: (data: { name: string; email: string; password: string; phone?: string }) =>
      fetchAPI<{ user: User; token: string }>(`/auth/register`, { method: 'POST', body: data }),
    
    login: (email: string, password: string) =>
      fetchAPI<{ user: User; token: string }>(`/auth/login`, { method: 'POST', body: { email, password } }),
    
    logout: (token: string) =>
      fetchAPI(`/auth/logout`, { method: 'POST', token }),
    
    me: (token: string) =>
      fetchAPI<{ user: User }>(`/auth/me`, { token }),
  },
  
  // Orders (authenticated)
  orders: {
    create: (token: string, data: any) =>
      fetchAPI<Order>(`/orders`, { method: 'POST', body: data, token }),
    
    list: (token: string) =>
      fetchAPI<Order[]>(`/orders`, { token }),
    
    get: (token: string, id: number) =>
      fetchAPI<Order>(`/orders/${id}`, { token }),
  },
  
  // Mobile endpoints (Phase 4)
  mobile: {
    cart: {
      get: (token: string) =>
        fetchAPI<CartItem[]>(`/mobile/cart`, { token }),
      
      add: (token: string, productId: number, quantity: number) =>
        fetchAPI<CartItem>(`/mobile/cart`, { method: 'POST', body: { product_id: productId, quantity }, token }),
      
      update: (token: string, id: number, quantity: number) =>
        fetchAPI<CartItem>(`/mobile/cart/${id}`, { method: 'PUT', body: { quantity }, token }),
      
      remove: (token: string, id: number) =>
        fetchAPI(`/mobile/cart/${id}`, { method: 'DELETE', token }),
      
      clear: (token: string) =>
        fetchAPI(`/mobile/cart`, { method: 'DELETE', token }),
    },
    
    favorites: {
      list: (token: string) =>
        fetchAPI<Product[]>(`/mobile/favorites`, { token }),
      
      toggle: (token: string, productId: number) =>
        fetchAPI<{ favorited: boolean }>(`/mobile/favorites/toggle`, { method: 'POST', body: { product_id: productId }, token }),
    },
  },
  
  // AI Features
  ai: {
    // Recommendations
    recommendations: {
      track: (data: { user_id?: number; session_id?: string; event_type: string; product_id: number; metadata?: any }) =>
        fetchAPI(`/recommendations/track`, { method: 'POST', body: data }),

      getPersonalized: (token?: string) =>
        fetchAPI<Product[]>(`/user/recommendations`, token ? { token } : undefined),

      getFrequentlyBoughtTogether: (productId: number) =>
        fetchAPI<Product[]>(`/products/${productId}/frequently-bought-together`),

      getShopTheLook: (productId: number) =>
        fetchAPI<Product[]>(`/products/${productId}/shop-the-look`),

      getCartUpsell: (productIds: number[], token?: string) =>
        fetchAPI<Product[]>(`/products/cart-upsell?ids=${productIds.join(',')}`, token ? { token } : undefined),
    },

    // Virtual Try-On
    tryOn: {
      initiate: (productSlug: string, userPhotoBase64?: string) =>
        fetchAPI<{ session_id: string; status: string; estimated_time: number }>(`/mirrago/try-on/${productSlug}`, {
          method: 'POST',
          body: { user_photo: userPhotoBase64 },
        }),

      checkStatus: (sessionId: string) =>
        fetchAPI<{ status: string; tryon_image?: string; error_message?: string }>(`/mirrago/status/${sessionId}`),

      getDeepLink: (productSlug: string, color?: string) =>
        fetchAPI<{ deep_link: string }>(`/mirrago/deep-link/${productSlug}${color ? `?color=${color}` : ''}`),
    },
  },

  // Health check
  health: () =>
    fetchAPI<{ status: string; timestamp: string }>(`/health`),
};

export default api;
