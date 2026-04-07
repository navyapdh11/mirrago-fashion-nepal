// ============================================
// KAIROS-MIRRAGO: Reasoning Engine
// Chain-of-Thought (CoT), Tree-of-Thought (ToT), Graph-of-Thought (GoT)
// Adapted for e-commerce fashion recommendations
// ============================================

import {
  ChainOfThought,
  CoTStep,
  TreeOfThought,
  ThoughtNode,
  ThoughtBranch,
  PruningEntry,
  GraphOfThought,
  GoTNode,
  GoTEdge,
  GoTCluster,
  Product,
  UserPreferenceProfile,
  StyleContext,
  ChainOfThoughtRef,
  TreeOfThoughtRef,
  GraphOfThoughtRef,
  ReasoningResult as ReasoningResultType,
} from './types';
import { getTags, isTrending, isOccasion } from './utils';

// ============================================
// Chain-of-Thought (CoT) Reasoning
// Explains WHY a product is recommended
// ============================================

export function generateChainOfThought(
  product: Product,
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  reasoning: string[]
): ChainOfThought {
  const steps: CoTStep[] = [];

  // Step 1: Preference Alignment
  steps.push({
    step: 1,
    reasoning: 'Analyzing user preference alignment',
    evidence: [
      `Category match: ${product.category}`,
      `Price within range: रू${product.price} vs रू${preferences.priceRange.min}-रू${preferences.priceRange.max}`,
      product.brand && preferences.preferredBrands.includes(product.brand)
        ? `Brand preference: ${product.brand} (preferred)`
        : `Brand: ${product.brand}`,
    ],
  });

  // Step 2: Style Context Fit
  steps.push({
    step: 2,
    reasoning: 'Evaluating style context compatibility',
    evidence: [
      styleContext.occasion ? `Occasion fit: ${styleContext.occasion}` : 'No specific occasion specified',
      styleContext.season ? `Season appropriateness: ${styleContext.season}` : 'General seasonality',
      `Style tags match: ${getTags(product).filter(t => preferences.styleTags.includes(t)).join(', ') || 'no direct style match'}`,
    ],
  });

  // Step 3: Social/Popularity Signals
  steps.push({
    step: 3,
    reasoning: 'Considering popularity and social proof',
    evidence: [
      product.discount_percentage 
        ? `Currently ${product.discount_percentage}% off (good value)` 
        : 'Regular pricing',
      isTrending(product) ? 'Trending product (high demand)' : 'Standard product',
      `Category: ${product.category}`,
    ],
  });

  // Step 4: Final Recommendation Synthesis
  steps.push({
    step: 4,
    reasoning: 'Synthesizing recommendation rationale',
    evidence: reasoning,
  });

  // Calculate confidence
  let confidence = 0.5; // base confidence
  if (preferences.preferredCategories.includes(product.category)) confidence += 0.15;
  if (priceInRange(product.price, preferences.priceRange)) confidence += 0.1;
  if (product.brand && preferences.preferredBrands.includes(product.brand)) confidence += 0.1;
  if (product.discount_percentage && product.discount_percentage > 10) confidence += 0.05;
  if (isTrending(product)) confidence += 0.05;
  confidence = Math.min(confidence, 1.0);

  const conclusion = generateConclusion(product, preferences, styleContext);

  return { steps, conclusion, confidence };
}

function priceInRange(price: number, range: { min: number; max: number }): boolean {
  return price >= range.min && price <= range.max;
}

function generateConclusion(
  product: Product,
  preferences: UserPreferenceProfile,
  styleContext: StyleContext
): string {
  const parts: string[] = [];
  
  parts.push(`I recommend the ${product.name}`);
  
  if (preferences.preferredCategories.includes(product.category)) {
    parts.push(`because it matches your ${product.category} preference`);
  }
  
  if (priceInRange(product.price, preferences.priceRange)) {
    parts.push(`fits your budget`);
  }
  
  if (product.discount_percentage && product.discount_percentage > 10) {
    parts.push(`and is currently ${product.discount_percentage}% off`);
  }
  
  if (styleContext.occasion) {
    parts.push(`- perfect for ${styleContext.occasion} occasions`);
  }
  
  return parts.join(', ') + '.';
}

// ============================================
// Tree-of-Thought (ToT) Reasoning
// Explores multiple recommendation paths
// ============================================

export function buildTreeOfThought(
  products: Product[],
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  maxDepth: number = 3
): TreeOfThought {
  const root: ThoughtNode = {
    id: 'root',
    parentId: null,
    thought: `Find the best products for: ${styleContext.occasion || 'general shopping'} with budget ${styleContext.budget ? `रू${styleContext.budget}` : 'no limit'}`,
    score: 1.0,
    depth: 0,
    children: [],
  };

  const branches: ThoughtBranch[] = [];
  const pruningLog: PruningEntry[] = [];
  const allNodes: ThoughtNode[] = [root];
  let nodeIdCounter = 1;

  // Level 1: Category branching
  const categories = Array.from(new Set(products.map(p => p.category)));
  const topCategories = categories
    .map(cat => ({
      category: cat,
      score: calculateCategoryScore(cat, products, preferences),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, categories.length));

  for (const catScore of topCategories) {
    const nodeId = `cat_${nodeIdCounter++}`;
    const categoryNode: ThoughtNode = {
      id: nodeId,
      parentId: 'root',
      thought: `Explore ${catScore.category} (score: ${catScore.score.toFixed(2)})`,
      score: catScore.score,
      depth: 1,
      children: [],
    };
    allNodes.push(categoryNode);
    root.children.push(nodeId);

    // Level 2: Brand/Style branching within category
    const categoryProducts = products.filter(p => p.category === catScore.category);
    const topProducts = categoryProducts
      .map(p => ({
        product: p,
        score: scoreProduct(p, preferences, styleContext),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, categoryProducts.length));

    for (const prodScore of topProducts) {
      const prodNodeId = `prod_${nodeIdCounter++}`;
      const prodNode: ThoughtNode = {
        id: prodNodeId,
        parentId: nodeId,
        thought: `${prodScore.product.name} - रू${prodScore.product.price}${prodScore.product.discount_percentage ? ` (${prodScore.product.discount_percentage}% off)` : ''}`,
        score: prodScore.score,
        depth: 2,
        children: [],
      };
      allNodes.push(prodNode);
      categoryNode.children.push(prodNodeId);

      // Level 3: Outfit completion/alternatives
      if (maxDepth >= 3) {
        const alternatives = findAlternatives(prodScore.product, products, preferences);
        alternatives.forEach((alt, idx) => {
          const altNodeId = `alt_${nodeIdCounter++}`;
          const altNode: ThoughtNode = {
            id: altNodeId,
            parentId: prodNodeId,
            thought: `Alternative: ${alt.name} - रू${alt.price}`,
            score: scoreProduct(alt, preferences, styleContext) * 0.8,
            depth: 3,
            children: [],
          };
          allNodes.push(altNode);
          prodNode.children.push(altNodeId);
        });
      }
    }
  }

  // Prune low-score branches
  pruneLowScoreNodes(allNodes, 0.3, pruningLog);

  // Build branches from root to leaves
  buildBranches(root, allNodes, [], branches);

  // Select best path
  const selectedPath = selectBestPath(branches);

  return {
    root,
    branches,
    selectedPath,
    pruningLog,
  };
}

function calculateCategoryScore(
  category: string,
  products: Product[],
  preferences: UserPreferenceProfile
): number {
  const categoryProducts = products.filter(p => p.category === category);
  if (categoryProducts.length === 0) return 0;

  let score = 0.5; // base
  if (preferences.preferredCategories.includes(category)) score += 0.3;
  
  const avgPrice = categoryProducts.reduce((sum, p) => sum + p.price, 0) / categoryProducts.length;
  if (priceInRange(avgPrice, preferences.priceRange)) score += 0.2;
  
  const hasPreferredBrands = categoryProducts.some(p => p.brand && preferences.preferredBrands.includes(p.brand));
  if (hasPreferredBrands) score += 0.1;
  
  return Math.min(score, 1.0);
}

function scoreProduct(
  product: Product,
  preferences: UserPreferenceProfile,
  styleContext: StyleContext
): number {
  let score = 0.4; // base score
  
  // Preference matching
  if (preferences.preferredCategories.includes(product.category)) score += 0.15;
  if (product.brand && preferences.preferredBrands.includes(product.brand)) score += 0.1;
  if (priceInRange(product.price, preferences.priceRange)) score += 0.15;
  
  // Style matching
  const matchingStyles = getTags(product).filter(t => preferences.styleTags.includes(t));
  score += matchingStyles.length * 0.05;
  
  // Value signals
  if (product.discount_percentage) score += Math.min(product.discount_percentage / 100, 0.15);
  if (isTrending(product)) score += 0.05;
  
  // Occasion fit
  if (styleContext.occasion && getTags(product).includes(styleContext.occasion)) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}

function findAlternatives(
  product: Product,
  products: Product[],
  preferences: UserPreferenceProfile
): Product[] {
  return products
    .filter(p => 
      p.id !== product.id &&
      p.category === product.category &&
      Math.abs(p.price - product.price) / product.price < 0.3
    )
    .slice(0, 2);
}

function pruneLowScoreNodes(
  nodes: ThoughtNode[],
  threshold: number,
  pruningLog: PruningEntry[]
): void {
  for (const node of nodes) {
    if (node.score < threshold && node.children.length === 0) {
      const parent = nodes.find(n => n.id === node.parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== node.id);
        pruningLog.push({
          nodeId: node.id,
          reason: `Score ${node.score.toFixed(2)} below threshold ${threshold}`,
          prunedAt: Date.now(),
        });
      }
    }
  }
}

function buildBranches(
  node: ThoughtNode,
  allNodes: ThoughtNode[],
  currentPath: string[],
  branches: ThoughtBranch[]
): void {
  const path = [...currentPath, node.id];
  
  if (node.children.length === 0) {
    branches.push({
      id: `branch_${path.join('_')}`,
      path,
      terminalScore: node.score,
      isComplete: true,
    });
  } else {
    for (const childId of node.children) {
      const child = allNodes.find(n => n.id === childId);
      if (child) {
        buildBranches(child, allNodes, path, branches);
      }
    }
  }
}

function selectBestPath(branches: ThoughtBranch[]): string[] {
  const best = branches.reduce(
    (best, branch) => (branch.terminalScore > best.terminalScore ? branch : best),
    branches[0]
  );
  return best?.path || [];
}

// ============================================
// Graph-of-Thought (GoT) Reasoning
// Maps product relationships for "Shop the Look"
// ============================================

export function buildGraphOfThought(
  products: Product[],
  preferences: UserPreferenceProfile,
  selectedProductId: string | null = null
): GraphOfThought {
  const nodes: GoTNode[] = [];
  const edges: GoTEdge[] = [];
  const clusters: GoTCluster[] = [];

  // Create product nodes
  const relevantProducts = selectedProductId
    ? products.filter(p => String(p.id) === selectedProductId || isComplementary(p, products.find(x => String(x.id) === selectedProductId)!))
    : products.slice(0, 20);

  for (const product of relevantProducts) {
    nodes.push({
      id: `prod_${product.id}`,
      productId: String(product.id),
      concept: product.name,
      type: 'product',
      weight: scoreProduct(product, preferences, {
        occasion: null,
        season: null,
        budget: null,
        mood: null,
        constraints: [],
      }),
    });

    // Add style/occasion/attribute nodes
    getTags(product).forEach(tag => {
      const existingNode = nodes.find(n => n.id === `attr_${tag}`);
      if (!existingNode) {
        nodes.push({
          id: `attr_${tag}`,
          concept: tag,
          type: isOccasion(tag) ? 'occasion' : 'style',
          weight: 0.5,
        });
      }
      
      edges.push({
        source: `prod_${product.id}`,
        target: `attr_${tag}`,
        relation: 'stylistic_match',
        strength: 0.8,
      });
    });
  }

  // Build edges: complementary products
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      
      if (nodeA.type === 'product' && nodeB.type === 'product' && nodeA.productId && nodeB.productId) {
        const prodA = products.find(p => String(p.id) === nodeA.productId);
        const prodB = products.find(p => String(p.id) === nodeB.productId);
        
        if (prodA && prodB && areComplementary(prodA, prodB)) {
          edges.push({
            source: nodeA.id,
            target: nodeB.id,
            relation: 'complements',
            strength: calculateComplementStrength(prodA, prodB),
          });
        } else if (prodA && prodB && prodA.category === prodB.category) {
          edges.push({
            source: nodeA.id,
            target: nodeB.id,
            relation: 'alternatives',
            strength: 1 - Math.abs(prodA.price - prodB.price) / Math.max(prodA.price, prodB.price),
          });
        }
      }
    }
  }

  // Cluster detection (simple: group by shared attributes)
  detectClusters(nodes, edges, clusters);

  // Calculate centrality
  const centralityScores: Record<string, number> = {};
  for (const node of nodes) {
    const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
    centralityScores[node.id] = connectedEdges.reduce((sum, e) => sum + e.strength, 0) / Math.max(edges.length, 1);
  }

  return { nodes, edges, clusters, centralityScores };
}

function isComplementary(product: Product, baseProduct: Product): boolean {
  const complementaryCategories: Record<string, string[]> = {
    'tops': ['bottoms', 'outerwear', 'accessories'],
    'bottoms': ['tops', 'shoes'],
    'dresses': ['accessories', 'shoes', 'outerwear'],
    'shoes': ['bottoms', 'dresses'],
    'accessories': ['tops', 'dresses'],
    'outerwear': ['tops', 'dresses'],
  };
  
  return (complementaryCategories[baseProduct.category] || []).includes(product.category);
}

function areComplementary(a: Product, b: Product): boolean {
  return isComplementary(a, b) || isComplementary(b, a);
}

function calculateComplementStrength(a: Product, b: Product): number {
  let strength = 0.5;
  
  // Style tag overlap
  const sharedTags = getTags(a).filter(t => getTags(b).includes(t));
  strength += sharedTags.length * 0.1;
  
  // Price harmony
  const priceRatio = Math.min(a.price, b.price) / Math.max(a.price, b.price);
  strength += priceRatio * 0.2;
  
  // Brand match
  if (a.brand === b.brand) strength += 0.1;
  
  return Math.min(strength, 1.0);
}

function detectClusters(nodes: GoTNode[], edges: GoTEdge[], clusters: GoTCluster[]): void {
  // Simple clustering: group products by shared style/occasion nodes
  const styleNodes = nodes.filter(n => n.type === 'style' || n.type === 'occasion');
  
  styleNodes.forEach(styleNode => {
    const connectedProducts = edges
      .filter(e => e.target === styleNode.id || e.source === styleNode.id)
      .map(e => e.source === styleNode.id ? e.target : e.source)
      .filter(id => id.startsWith('prod_'));
    
    if (connectedProducts.length >= 2) {
      clusters.push({
        id: `cluster_${styleNode.id}`,
        name: styleNode.concept,
        nodeIds: [styleNode.id, ...connectedProducts],
        centroid: { style: 1.0 },
      });
    }
  });
}

// ============================================
// Unified Reasoning Interface
// ============================================

export async function generateReasoning(
  product: Product,
  allProducts: Product[],
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  enableToT: boolean = true,
  enableGoT: boolean = true
): Promise<ReasoningResultType> {
  try {
    // Chain-of-Thought (always enabled for explanations)
    const cot = generateChainOfThought(product, preferences, styleContext, []);

    // Tree-of-Thought (for alternatives exploration)
    let tot: TreeOfThought | undefined;
    if (enableToT && allProducts.length > 0) {
      tot = buildTreeOfThought(allProducts, preferences, styleContext);
    }

    // Graph-of-Thought (for relationship mapping)
    let got: GraphOfThought | undefined;
    if (enableGoT && allProducts.length > 0) {
      got = buildGraphOfThought(allProducts, preferences, String(product.id));
    }

    // Extract alternatives from ToT
    const alternatives: string[] = [];
    if (tot) {
      for (const branch of tot.branches.slice(0, 3)) {
        const leafId = branch.path[branch.path.length - 1];
        if (leafId.startsWith('prod_')) {
          const prodId = leafId.replace('prod_', '');
          const prod = allProducts.find(p => String(p.id) === prodId);
          if (prod && String(prod.id) !== String(product.id)) {
            alternatives.push(prod.name);
          }
        }
      }
    }

    return {
      cot: cot ? { steps: cot.steps, conclusion: cot.conclusion, confidence: cot.confidence } : undefined,
      tot: tot ? { root: { id: tot.root.id, thought: tot.root.thought, score: tot.root.score }, branches: tot.branches.map(b => ({ id: b.id, path: b.path, terminalScore: b.terminalScore })), selectedPath: tot.selectedPath } : undefined,
      got: got ? { nodes: got.nodes.map(n => ({ id: n.id, concept: n.concept, type: n.type, weight: n.weight })), edges: got.edges.map(e => ({ source: e.source, target: e.target, relation: e.relation, strength: e.strength })), clusters: got.clusters.map(c => ({ id: c.id, name: c.name, nodeIds: c.nodeIds })) } : undefined,
      recommendation: cot.conclusion,
      alternatives,
      confidence: cot.confidence,
    };
  } catch (error) {
    console.error('[Reasoning] Error generating reasoning:', error);
    return {
      recommendation: `Recommended: ${product.name}`,
      alternatives: [],
      confidence: 0.3,
    };
  }
}
