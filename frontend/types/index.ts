export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  color: string | null;
  price: number;
  compare_price: number | null;
  primary_image_url: string | null;
  image_urls: string[] | null;
  style_tags: string[];
  occasion_tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  discount_percentage?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  size: string;
  color: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  city: string;
  address: string;
  contact_number: string | null;
  manager_name: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface InventoryLevel {
  id: number;
  product_variant_id: number;
  warehouse_id: number;
  stock_qty: number;
  reserved_qty: number;
  reorder_level: number;
  warehouse?: Warehouse;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  product_variant_id: number | null;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: number;
  user_id: number;
  order_number: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shipping_address: string;
  shipping_city: string;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationData<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}
