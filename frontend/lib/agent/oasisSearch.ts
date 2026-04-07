// ============================================
// KAIROS-MIRRAGO: OASIS-IS Agentic Search
// Intelligent product search with intent understanding
// OASIS-IS = Optimized Agentic Search with Intent Synthesis
// ============================================

import {
  OasisQuery,
  OasisResult,
  SearchResult,
  SearchSuggestion,
  SearchIntent,
  SearchFacet,
  SearchConstraint,
  Product,
  UserPreferenceProfile,
} from './types';
import { isColor, isOccasion, isStyle } from './utils';

// ============================================
// Intent Classification
// ============================================

interface IntentPattern {
  intent: SearchIntent;
  keywords: RegExp[];
  priority: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'direct_product',
    keywords: [/\b(buy|get|find|show|search)\b.*\b(this|that|specific|named)\b/i],
    priority: 1,
  },
  {
    intent: 'brand_specific',
    keywords: [/\b(nike|adidas|zara|hm|levi|gucci|prada|gucci|puma|reebok)\b/i],
    priority: 2,
  },
  {
    intent: 'price_driven',
    keywords: [/\b(cheap|affordable|budget|under|below|less than|discount|sale|deal)\b/i],
    priority: 3,
  },
  {
    intent: 'occasion_based',
    keywords: [/\b(wedding|party|office|work|formal|casual|gym|outdoor|evening|interview|date)\b/i],
    priority: 4,
  },
  {
    intent: 'style_inspiration',
    keywords: [/\b(inspire|trend|fashionable|stylish|cool|elegant|modern|vintage|classic)\b/i],
    priority: 5,
  },
  {
    intent: 'outfit_completion',
    keywords: [/\b(match|pair|goes with|complete|outfit|ensemble|coordinate)\b/i],
    priority: 6,
  },
  {
    intent: 'category_browse',
    keywords: [/\b(browse|look|explore|show me|what.*have|what.*available)\b/i],
    priority: 7,
  },
  {
    intent: 'trend_exploration',
    keywords: [/\b(trending|popular|hot|new|latest|season|collection)\b/i],
    priority: 8,
  },
];

export function classifyIntent(query: string): SearchIntent {
  const sortedPatterns = [...INTENT_PATTERNS].sort((a, b) => a.priority - b.priority);
  
  for (const pattern of sortedPatterns) {
    for (const regex of pattern.keywords) {
      if (regex.test(query)) {
        return pattern.intent;
      }
    }
  }
  
  // Default: if query contains category-like words
  const categoryKeywords = ['shirt', 'dress', 'pants', 'shoes', 'bag', 'watch', 'jacket', 'top', 'bottom'];
  if (categoryKeywords.some(kw => query.toLowerCase().includes(kw))) {
    return 'category_browse';
  }
  
  return 'style_inspiration';
}

// ============================================
// Query Parsing
// ============================================

interface ParsedQuery {
  searchTerm: string;
  facets: SearchFacet[];
  constraints: SearchConstraint[];
}

const FACET_KEYWORDS: Record<string, { type: SearchFacet['type']; keywords: string[] }> = {
  category: {
    type: 'category',
    keywords: ['shirt', 'dress', 'pants', 'shoes', 'bag', 'watch', 'jacket', 'top', 'bottom', 'outerwear', 'accessories'],
  },
  brand: {
    type: 'brand',
    keywords: ['nike', 'adidas', 'zara', 'hm', 'levi', 'gucci', 'prada', 'puma', 'reebok', 'under armour'],
  },
  color: {
    type: 'color',
    keywords: ['red', 'blue', 'black', 'white', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'grey', 'orange', 'navy', 'beige'],
  },
  occasion: {
    type: 'occasion',
    keywords: ['wedding', 'party', 'office', 'work', 'formal', 'casual', 'gym', 'outdoor', 'evening', 'interview', 'date'],
  },
  style: {
    type: 'style',
    keywords: ['modern', 'vintage', 'classic', 'minimal', 'sporty', 'elegant', 'trendy', 'bohemian', 'streetwear'],
  },
};

export function parseQuery(rawQuery: string, preferences: UserPreferenceProfile): OasisQuery {
  const query = rawQuery.toLowerCase();
  
  // Extract facets
  const facets: SearchFacet[] = [];
  const constraintTerms: string[] = [];
  let searchTerm = rawQuery;

  for (const [facetName, facetDef] of Object.entries(FACET_KEYWORDS)) {
    for (const keyword of facetDef.keywords) {
      if (query.includes(keyword)) {
        facets.push({
          type: facetDef.type,
          value: keyword,
          weight: 1.0,
        });
        constraintTerms.push(keyword);
      }
    }
  }

  // Extract price constraints
  const pricePatterns = [
    { regex: /under\s*रू\s*(\d+)/i, type: 'max' as const, group: 1 },
    { regex: /below\s*रू\s*(\d+)/i, type: 'max' as const, group: 1 },
    { regex: /रू\s*(\d+)\s*or less/i, type: 'max' as const, group: 1 },
    { regex: /between\s*रू\s*(\d+)\s*and\s*रू\s*(\d+)/i, type: 'range' as const, group1: 1, group2: 2 },
    { regex: /under\s*\$\s*(\d+)/i, type: 'max' as const, group: 1 },
    { regex: /below\s*\$\s*(\d+)/i, type: 'max' as const, group: 1 },
    { regex: /\$\s*(\d+)/i, type: 'approx' as const, group: 1 },
  ];

  const constraints: SearchConstraint[] = [];

  for (const pattern of pricePatterns) {
    const match = rawQuery.match(pattern.regex);
    if (match) {
      if (pattern.type === 'max' && 'group' in pattern) {
        const maxPrice = parseInt(match[pattern.group], 10);
        constraints.push({
          type: 'must_have',
          attribute: 'price',
          value: maxPrice,
        });
        constraints.push({
          type: 'prefer',
          attribute: 'price',
          value: maxPrice * 0.7,
        });
      } else if (pattern.type === 'range' && 'group1' in pattern) {
        const minPrice = parseInt(match[pattern.group1], 10);
        const maxPrice = parseInt(match[pattern.group2], 10);
        constraints.push({
          type: 'must_have',
          attribute: 'price',
          value: `${minPrice}-${maxPrice}`,
        });
      } else if (pattern.type === 'approx' && 'group' in pattern) {
        const approxPrice = parseInt(match[pattern.group], 10);
        constraints.push({
          type: 'prefer',
          attribute: 'price',
          value: approxPrice,
        });
      }
      break;
    }
  }

  // Extract size constraints
  const sizePattern = rawQuery.match(/\b(size\s+)?([SMLX]+\d*|\d+)\b/i);
  if (sizePattern) {
    constraints.push({
      type: 'must_have',
      attribute: 'size',
      value: sizePattern[2].toUpperCase(),
    });
  }

  // Extract negative constraints (must_not_have)
  const negations = rawQuery.match(/(?:no|not|without|except|don't|dont)\s+(\w+)/gi);
  if (negations) {
    for (const neg of negations) {
      const word = neg.replace(/^(no|not|without|except|don't|dont)\s+/i, '').toLowerCase();
      constraints.push({
        type: 'must_not_have',
        attribute: 'tag',
        value: word,
      });
    }
  }

  // Clean search term (remove facet keywords and price mentions)
  searchTerm = rawQuery
    .replace(/under\s*(रू|\$)\s*\d+/gi, '')
    .replace(/below\s*(रू|\$)\s*\d+/gi, '')
    .replace(/between\s*रू\s*\d+\s*and\s*रू\s*\d+/gi, '')
    .replace(/\b(size\s+)?[SMLX]+\d*\b/gi, '')
    .replace(/\b(no|not|without|except|don't|dont)\s+\w+/gi, '')
    .trim();

  // If no explicit facets found, try semantic inference
  if (facets.length === 0 && searchTerm) {
    const inferredFacets = inferFacetsFromContext(searchTerm, preferences);
    facets.push(...inferredFacets);
  }

  const intent = classifyIntent(rawQuery);

  return {
    raw: rawQuery,
    intent,
    facets,
    constraints,
  };
}

function inferFacetsFromContext(
  searchTerm: string,
  preferences: UserPreferenceProfile
): SearchFacet[] {
  const facets: SearchFacet[] = [];

  // Use user preferences to infer facets
  if (preferences.preferredCategories.length > 0) {
    facets.push({
      type: 'category',
      value: preferences.preferredCategories[0],
      weight: 0.5,
    });
  }

  if (preferences.colorPreferences.length > 0) {
    facets.push({
      type: 'color',
      value: preferences.colorPreferences[0],
      weight: 0.4,
    });
  }

  return facets;
}

// ============================================
// Search Execution
// ============================================

export function executeOasisSearch(
  query: OasisQuery,
  products: Product[],
  preferences: UserPreferenceProfile
): OasisResult {
  const results: SearchResult[] = [];

  for (const product of products) {
    let score = 0;
    const matchReasons: string[] = [];

    // Text matching
    const searchLower = query.raw.toLowerCase();
    const nameMatch = product.name.toLowerCase().includes(searchLower);
    const descMatch = product.description?.toLowerCase().includes(searchLower);
    
    if (nameMatch) {
      score += 0.4;
      matchReasons.push('Name match');
    }
    if (descMatch) {
      score += 0.2;
      matchReasons.push('Description match');
    }

    // Facet matching
    const productFacets = extractProductFacets(product);
    
    for (const facet of query.facets) {
      const facetValue = facet.value.toLowerCase();
      
      for (const [facetType, facetValues] of Object.entries(productFacets)) {
        if (facetValues.includes(facetValue)) {
          score += facet.weight * 0.3;
          matchReasons.push(`${facetType}: ${facetValue}`);
        }
      }
    }

    // Constraint checking
    let constraintViolated = false;
    
    for (const constraint of query.constraints) {
      if (constraint.type === 'must_not_have') {
        const productTags = [...(product.style_tags || []), ...(product.occasion_tags || [])].map(t => t.toLowerCase());
        if (productTags.includes(String(constraint.value).toLowerCase())) {
          constraintViolated = true;
          break;
        }
      }
      
      if (constraint.type === 'must_have' && constraint.attribute === 'price') {
        const priceConstraint = String(constraint.value);
        if (priceConstraint.includes('-')) {
          const [min, max] = priceConstraint.split('-').map(Number);
          if (product.price < min || product.price > max) {
            constraintViolated = true;
            break;
          }
        } else {
          const maxPrice = Number(constraint.value);
          if (product.price > maxPrice) {
            constraintViolated = true;
            break;
          }
        }
      }
    }

    if (constraintViolated) {
      score = 0;
    }

    // Preference bonus
    if (preferences.preferredCategories.includes(product.category)) {
      score += 0.1;
      matchReasons.push('Category preference');
    }
    if (product.brand && preferences.preferredBrands.includes(product.brand)) {
      score += 0.1;
      matchReasons.push('Brand preference');
    }
    if (product.discount_percentage) {
      score += (product.discount_percentage / 100) * 0.1;
      matchReasons.push(`${product.discount_percentage}% off`);
    }
    if (product.discount_percentage && product.discount_percentage > 15) {
      score += 0.05;
      matchReasons.push('Trending');
    }

    if (score > 0) {
      results.push({
        productId: String(product.id),
        score: Math.min(score, 1.0),
        matchReasons,
        facets: productFacets,
      });
    }
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  // Generate suggestions
  const suggestions = generateSuggestions(query, results, products);

  return {
    products: results.slice(0, 20),
    intent: query.intent,
    appliedFacets: query.facets,
    suggestions,
    totalCount: results.length,
  };
}

function extractProductFacets(product: Product): Record<string, string[]> {
  const facets: Record<string, string[]> = {
    category: [product.category.toLowerCase()],
    brand: [product.brand?.toLowerCase() || 'unknown'],
    color: [...(product.style_tags || []), ...(product.occasion_tags || [])].filter(t => isColor(t)),
    occasion: [...(product.style_tags || []), ...(product.occasion_tags || [])].filter(t => isOccasion(t)),
    style: [...(product.style_tags || []), ...(product.occasion_tags || [])].filter(t => isStyle(t)),
  };
  return facets;
}

function generateSuggestions(
  query: OasisQuery,
  results: SearchResult[],
  products: Product[]
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];

  // Refine suggestion (if too many results)
  if (results.length > 10) {
    suggestions.push({
      type: 'refine',
      query: `${query.raw} with discount`,
      reason: 'Narrow to sale items',
    });
  }

  // Expand suggestion (if few results)
  if (results.length < 3) {
    suggestions.push({
      type: 'expand',
      query: query.raw.replace(/\b(under|below)\s*(रू|\$)\s*\d+/gi, '').trim(),
      reason: 'Remove price constraint to see more options',
    });
  }

  // Alternative suggestion
  if (query.facets.some(f => f.type === 'category')) {
    const category = query.facets.find(f => f.type === 'category')?.value;
    suggestions.push({
      type: 'alternative',
      query: `similar to ${category}`,
      reason: 'Explore related categories',
    });
  }

  // Complement suggestion
  if (results.length > 0) {
    suggestions.push({
      type: 'complement',
      query: `accessories to match`,
      reason: 'Complete your look',
    });
  }

  return suggestions.slice(0, 4);
}

// ============================================
// High-Level Search API
// ============================================

export function searchProducts(
  rawQuery: string,
  products: Product[],
  preferences: UserPreferenceProfile
): OasisResult {
  const query = parseQuery(rawQuery, preferences);
  return executeOasisSearch(query, products, preferences);
}

export function searchWithIntent(
  rawQuery: string,
  products: Product[],
  preferences: UserPreferenceProfile,
  intent: SearchIntent
): OasisResult {
  const query = parseQuery(rawQuery, preferences);
  query.intent = intent;
  return executeOasisSearch(query, products, preferences);
}
