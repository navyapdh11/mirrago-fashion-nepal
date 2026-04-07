// ============================================
// KAIROS-MIRRAGO: Agent Type Utilities
// Shared type-safe helper functions
// ============================================

import { Product } from './types';

/**
 * Get all tags from a product (handles both tags and style_tags)
 */
export function getTags(product: Product): string[] {
  return product.tags || product.style_tags || [];
}

/**
 * Get product brand (with null safety)
 */
export function getBrand(product: Product): string {
  return product.brand || 'Unknown';
}

/**
 * Get product price as number (handles string or number)
 */
export function getPrice(product: Product): number {
  return typeof product.price === 'string' ? parseFloat(product.price) : product.price;
}

/**
 * Get product ID as string (handles number or string)
 */
export function getProductId(product: Product): string {
  return String(product.id);
}

/**
 * Check if price is within range
 */
export function isPriceInRange(price: number, range: { min: number; max: number }): boolean {
  return price >= range.min && price <= range.max;
}

/**
 * Check if product matches category
 */
export function matchesCategory(product: Product, category: string): boolean {
  return product.category.toLowerCase() === category.toLowerCase();
}

/**
 * Check if product has tag
 */
export function hasTag(product: Product, tag: string): boolean {
  const tags = getTags(product);
  return tags.some(t => t.toLowerCase() === tag.toLowerCase());
}

/**
 * Check if product has any of the given tags
 */
export function hasAnyTag(product: Product, tags: string[]): boolean {
  const productTags = getTags(product).map(t => t.toLowerCase());
  return tags.some(tag => productTags.includes(tag.toLowerCase()));
}

/**
 * Check if product has all of the given tags
 */
export function hasAllTags(product: Product, tags: string[]): boolean {
  const productTags = getTags(product).map(t => t.toLowerCase());
  return tags.every(tag => productTags.includes(tag.toLowerCase()));
}

/**
 * Check if product is trending (discount as proxy)
 */
export function isTrending(product: Product): boolean {
  return !!product.discount_percentage && product.discount_percentage > 15;
}

/**
 * Normalize product for comparison
 */
export function normalizeProductInput(product: Product): Product {
  return {
    ...product,
    tags: getTags(product),
    brand: getBrand(product),
    price: getPrice(product),
  };
}

/**
 * Convert products to map by ID
 */
export function productsById(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const product of products) {
    map.set(getProductId(product), product);
  }
  return map;
}

/**
 * Filter products by price range
 */
export function filterByPriceRange(products: Product[], min: number, max: number): Product[] {
  return products.filter(p => isPriceInRange(getPrice(p), { min, max }));
}

/**
 * Filter products by category
 */
export function filterByCategory(products: Product[], category: string): Product[] {
  return products.filter(p => matchesCategory(p, category));
}

/**
 * Filter products by tag
 */
export function filterByTag(products: Product[], tag: string): Product[] {
  return products.filter(p => hasTag(p, tag));
}

/**
 * Sort products by price
 */
export function sortByPrice(products: Product[], ascending: boolean = true): Product[] {
  return [...products].sort((a, b) => {
    const diff = getPrice(a) - getPrice(b);
    return ascending ? diff : -diff;
  });
}

/**
 * Sort products by discount
 */
export function sortByDiscount(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const discA = a.discount_percentage || 0;
    const discB = b.discount_percentage || 0;
    return discB - discA;
  });
}

/**
 * Get trending products
 */
export function getTrendingProducts(products: Product[]): Product[] {
  return products.filter(p => isTrending(p));
}

/**
 * Get products with stock
 */
export function getInStockProducts(products: Product[]): Product[] {
  return products.filter(p => p.stock_status !== 'out_of_stock');
}

// ============================================
// Tag classification helpers (used by oasisSearch & reasoning)
// ============================================

const COLOR_TAGS = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'grey', 'orange', 'navy', 'beige'];
const OCCASION_TAGS = ['wedding', 'party', 'office', 'work', 'formal', 'casual', 'gym', 'outdoor', 'evening', 'interview', 'date'];
const STYLE_TAGS = ['modern', 'vintage', 'classic', 'minimal', 'sporty', 'elegant', 'trendy', 'bohemian', 'streetwear'];

export function isColor(tag: string): boolean {
  return COLOR_TAGS.includes(tag.toLowerCase());
}

export function isOccasion(tag: string): boolean {
  return OCCASION_TAGS.includes(tag.toLowerCase());
}

export function isStyle(tag: string): boolean {
  return STYLE_TAGS.includes(tag.toLowerCase());
}
