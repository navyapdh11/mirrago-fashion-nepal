// ============================================
// KAIROS-MIRRAGO: Monte Carlo Tree Search
// Optimizes product recommendation selection
// Adapted for e-commerce fashion exploration
// ============================================

import {
  MCTSNode,
  RecommendationState,
  MCTSResult,
  Product,
  UserPreferenceProfile,
  StyleContext,
} from './types';
import { getTags, isTrending } from './utils';

// ============================================
// MCTS Implementation for Recommendations
// ============================================

interface MCTSConfig {
  maxSimulations: number;
  explorationConstant: number;  // C parameter in UCB1
  maxDepth: number;
  budgetLimit: number;
  rolloutDepth: number;
}

const DEFAULT_CONFIG: MCTSConfig = {
  maxSimulations: 100,
  explorationConstant: 1.414,  // sqrt(2)
  maxDepth: 4,
  budgetLimit: 50000,
  rolloutDepth: 3,
};

export function runMCTS(
  products: Product[],
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  config: Partial<MCTSConfig> = {}
): MCTSResult {
  // Guard: empty product catalog
  if (products.length === 0) {
    return { selectedPath: [], totalValue: 0, simulationCount: 0, confidence: 0 };
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize root node
  const rootState: RecommendationState = {
    selectedProducts: [],
    budgetRemaining: styleContext.budget || cfg.budgetLimit,
    styleScore: 0,
    diversityScore: 0,
    userFitScore: 0,
  };

  const rootNode: MCTSNode = {
    id: 'root',
    productId: null,
    state: rootState,
    visits: 0,
    value: 0,
    children: [],
    parentId: null,
    unexploredActions: products.map(p => String(p.id)),
  };

  const nodeMap: Map<string, MCTSNode> = new Map([['root', rootNode]]);
  let simulationCount = 0;

  // MCTS Main Loop
  for (let i = 0; i < cfg.maxSimulations; i++) {
    // 1. Selection: traverse tree using UCB1 until leaf node
    const selectedNode = select(rootNode, nodeMap, cfg.explorationConstant);

    // 2. Expansion: add a child if possible
    const expandedNode = expand(selectedNode, nodeMap, products, cfg);
    if (!expandedNode) continue;

    // 3. Simulation (Rollout): random playout from expanded node
    const rolloutValue = rollout(expandedNode, products, preferences, styleContext, cfg);

    // 4. Backpropagation: update statistics up the tree
    backpropagate(expandedNode, rolloutValue, nodeMap);

    simulationCount++;
  }

  // Extract best path
  const selectedPath = extractBestPath(rootNode, nodeMap);
  const totalValue = calculateTotalValue(selectedPath, nodeMap);
  const confidence = totalValue / Math.max(simulationCount, 1);

  return {
    selectedPath,
    totalValue,
    simulationCount,
    confidence: Math.min(confidence, 1.0),
  };
}

// --- Phase 1: Selection (UCB1) ---

function select(
  node: MCTSNode,
  nodeMap: Map<string, MCTSNode>,
  explorationConstant: number
): MCTSNode {
  let current = node;

  while (current.children.length > 0 && current.unexploredActions.length === 0) {
    // Select child with highest UCB1 score
    let bestChild: MCTSNode | null = null;
    let bestUCB = -Infinity;

    for (const childId of current.children) {
      const child = nodeMap.get(childId);
      if (!child) continue;

      const ucb = calculateUCB1(child, current, explorationConstant);
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestChild = child;
      }
    }

    if (bestChild) {
      current = bestChild;
    } else {
      break;
    }
  }

  return current;
}

function calculateUCB1(
  child: MCTSNode,
  parent: MCTSNode,
  explorationConstant: number
): number {
  if (child.visits === 0) return Infinity;

  const exploitation = child.value / child.visits;
  const exploration = explorationConstant * Math.sqrt(Math.log(parent.visits) / child.visits);

  return exploitation + exploration;
}

// --- Phase 2: Expansion ---

function expand(
  node: MCTSNode,
  nodeMap: Map<string, MCTSNode>,
  products: Product[],
  config: MCTSConfig
): MCTSNode | null {
  if (node.unexploredActions.length === 0) return null;
  if (node.state.selectedProducts.length >= config.maxDepth) return null;

  // Pick an unexplored action
  const actionIndex = Math.floor(Math.random() * node.unexploredActions.length);
  const productId = node.unexploredActions.splice(actionIndex, 1)[0];

  const product = products.find(p => String(p.id) === productId);
  if (!product) return null;

  // Check budget constraint
  if (product.price > node.state.budgetRemaining) return null;

  // Create new state
  const newState: RecommendationState = {
    selectedProducts: [...node.state.selectedProducts, productId],
    budgetRemaining: node.state.budgetRemaining - product.price,
    styleScore: calculateStyleScore([...node.state.selectedProducts, productId], products),
    diversityScore: calculateDiversityScore([...node.state.selectedProducts, productId], products),
    userFitScore: calculateUserFitScore([...node.state.selectedProducts, productId], products, product),
  };

  const childId = `${node.id}_${productId}`;
  const childNode: MCTSNode = {
    id: childId,
    productId,
    state: newState,
    visits: 0,
    value: 0,
    children: [],
    parentId: node.id,
    unexploredActions: node.unexploredActions.filter(id => id !== productId),
  };

  node.children.push(childId);
  nodeMap.set(childId, childNode);

  return childNode;
}

// --- Phase 3: Simulation (Rollout) ---

function rollout(
  node: MCTSNode,
  products: Product[],
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  config: MCTSConfig
): number {
  let state = { ...node.state };
  let totalReward = 0;
  const selectedIds = [...state.selectedProducts];

  // Random playout for remaining depth
  for (let depth = 0; depth < config.rolloutDepth; depth++) {
    const available = products.filter(p => 
      !selectedIds.includes(String(p.id)) &&
      p.price <= state.budgetRemaining
    );

    if (available.length === 0) break;

    // Epsilon-greedy: mostly random, sometimes pick best
    const product = Math.random() < 0.8 
      ? available[Math.floor(Math.random() * available.length)]
      : pickBestForRollout(available, preferences);

    selectedIds.push(String(product.id));
    state = {
      selectedProducts: selectedIds,
      budgetRemaining: state.budgetRemaining - product.price,
      styleScore: calculateStyleScore(selectedIds, products),
      diversityScore: calculateDiversityScore(selectedIds, products),
      userFitScore: calculateUserFitScore(selectedIds, products, product),
    };

    // Immediate reward
    totalReward += calculateReward(product, preferences, styleContext, state);
  }

  // Terminal reward
  totalReward += terminalReward(state, preferences);

  return totalReward;
}

function pickBestForRollout(
  candidates: Product[],
  preferences: UserPreferenceProfile
): Product {
  if (candidates.length === 0) throw new Error('No candidates available for rollout');
  return candidates.reduce((best, p) => {
    const score = calculateProductFit(p, preferences);
    const bestScore = calculateProductFit(best, preferences);
    return score > bestScore ? p : best;
  }, candidates[0]);
}

function calculateReward(
  product: Product,
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  state: RecommendationState
): number {
  let reward = 0;

  // User preference match
  if (preferences.preferredCategories.includes(product.category)) reward += 0.3;
  if (product.brand && preferences.preferredBrands.includes(product.brand)) reward += 0.2;
  
  // Price fit
  const priceRange = preferences.priceRange;
  if (product.price >= priceRange.min && product.price <= priceRange.max) reward += 0.2;
  
  // Style match
  const matchingStyles = getTags(product).filter(t => preferences.styleTags.includes(t));
  reward += matchingStyles.length * 0.1;
  
  // Occasion fit
  if (styleContext.occasion && getTags(product).includes(styleContext.occasion)) {
    reward += 0.15;
  }
  
  // Discount bonus
  if (product.discount_percentage) {
    reward += (product.discount_percentage / 100) * 0.1;
  }
  
  // Trending bonus
  if (isTrending(product)) reward += 0.05;

  return Math.min(reward, 1.0);
}

function terminalReward(
  state: RecommendationState,
  preferences: UserPreferenceProfile
): number {
  let reward = 0;

  // Reward for using budget effectively (not too little, not too much)
  const budgetUtilization = 1 - (state.budgetRemaining / (preferences.priceRange.max || 50000));
  reward += Math.min(budgetUtilization * 0.2, 0.2);

  // Style coherence bonus
  reward += state.styleScore * 0.3;
  
  // Diversity bonus (don't recommend 5 identical shirts)
  reward += state.diversityScore * 0.2;
  
  // User fit bonus
  reward += state.userFitScore * 0.3;

  return reward;
}

// --- Phase 4: Backpropagation ---

function backpropagate(
  node: MCTSNode,
  reward: number,
  nodeMap: Map<string, MCTSNode>
): void {
  let current: MCTSNode | undefined = node;

  while (current) {
    current.visits += 1;
    current.value += reward;

    if (current.parentId) {
      current = nodeMap.get(current.parentId);
    } else {
      break;
    }
  }
}

// --- Path Extraction ---

function extractBestPath(
  root: MCTSNode,
  nodeMap: Map<string, MCTSNode>
): string[] {
  const path: string[] = [];
  let current: MCTSNode = root;

  while (current.children.length > 0) {
    // Pick child with most visits (most reliable)
    let bestChild: MCTSNode | null = null;
    let maxVisits = -1;

    for (const childId of current.children) {
      const child = nodeMap.get(childId);
      if (child && child.visits > maxVisits) {
        maxVisits = child.visits;
        bestChild = child;
      }
    }

    if (bestChild && bestChild.productId) {
      path.push(bestChild.productId);
      current = bestChild;
    } else {
      break;
    }
  }

  return path;
}

function calculateTotalValue(
  path: string[],
  nodeMap: Map<string, MCTSNode>
): number {
  if (path.length === 0) return 0;

  // Find the leaf node for this path
  let currentNode = nodeMap.get('root');
  for (const productId of path) {
    if (!currentNode) break;
    const childId = currentNode.children.find(id => {
      const child = nodeMap.get(id);
      return child?.productId === String(productId);
    });
    if (childId) {
      currentNode = nodeMap.get(childId);
    }
  }

  if (!currentNode || currentNode.visits === 0) return 0;

  return currentNode.value / currentNode.visits;
}

// --- Helper Scoring Functions ---

function calculateStyleScore(
  selectedIds: string[],
  products: Product[]
): number {
  if (selectedIds.length <= 1) return 0.5;

  const selectedProducts = selectedIds
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter((p): p is Product => !!p);

  // Count shared style tags
  let sharedCount = 0;
  let totalComparisons = 0;

  for (let i = 0; i < selectedProducts.length; i++) {
    for (let j = i + 1; j < selectedProducts.length; j++) {
      const tagsA = getTags(selectedProducts[i]);
      const tagsB = getTags(selectedProducts[j]);
      const shared = tagsA.filter(t => tagsB.includes(t)).length;
      sharedCount += shared;
      totalComparisons++;
    }
  }

  return totalComparisons > 0 ? sharedCount / (totalComparisons * 5) : 0.5;  // normalize by max ~5 tags
}

function calculateDiversityScore(
  selectedIds: string[],
  products: Product[]
): number {
  if (selectedIds.length <= 1) return 1.0;

  const selectedProducts = selectedIds
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter((p): p is Product => !!p);

  const categories = new Set(selectedProducts.map(p => p.category));
  const brands = new Set(selectedProducts.map(p => p.brand).filter((b): b is string => !!b));

  // Higher score = more diverse
  const categoryDiversity = categories.size / selectedProducts.length;
  const brandDiversity = brands.size / selectedProducts.length;

  return (categoryDiversity + brandDiversity) / 2;
}

function calculateUserFitScore(
  selectedIds: string[],
  products: Product[],
  lastProduct: Product
): number {
  // How well does the latest addition fit with previous selections?
  if (selectedIds.length <= 1) return 0.8;

  const previousIds = selectedIds.slice(0, -1);
  const previousProducts = previousIds
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter((p): p is Product => !!p);

  let fitScore = 0;
  for (const prev of previousProducts) {
    const complementaryCategories: Record<string, string[]> = {
      'tops': ['bottoms', 'outerwear', 'accessories'],
      'bottoms': ['tops', 'shoes'],
      'dresses': ['accessories', 'shoes', 'outerwear'],
      'shoes': ['bottoms', 'dresses'],
      'accessories': ['tops', 'dresses'],
      'outerwear': ['tops', 'dresses'],
    };

    const goodMatches = complementaryCategories[prev.category] || [];
    if (goodMatches.includes(lastProduct.category)) {
      fitScore += 1.0;
    } else if (prev.category === lastProduct.category) {
      fitScore += 0.3;  // same category = lower fit but still valid as alternative
    } else {
      fitScore += 0.1;
    }
  }

  return fitScore / previousProducts.length;
}

function calculateProductFit(
  product: Product,
  preferences: UserPreferenceProfile
): number {
  let score = 0;
  if (preferences.preferredCategories.includes(product.category)) score += 1;
  if (product.brand && preferences.preferredBrands.includes(product.brand)) score += 1;
  if (product.price >= preferences.priceRange.min && product.price <= preferences.priceRange.max) score += 1;
  return score;
}

// ============================================
// Quick Recommendation using MCTS
// ============================================

export function getMCTSRecommendations(
  products: Product[],
  preferences: UserPreferenceProfile,
  styleContext: StyleContext,
  count: number = 5
): { products: Product[]; confidence: number } {
  const result = runMCTS(products, preferences, styleContext, {
    maxSimulations: 150,
    maxDepth: count,
  });

  const recommendedProducts = result.selectedPath
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter((p): p is Product => !!p);

  return {
    products: recommendedProducts,
    confidence: result.confidence,
  };
}
