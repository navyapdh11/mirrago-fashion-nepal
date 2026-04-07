// ============================================
// KAIROS-MIRRAGO: AI Agent Type Definitions
// Adapted for e-commerce fashion reasoning
// ============================================

import type { Product as BaseProduct } from '@/types';

// Re-export Product for convenience with additional fields
export interface Product extends BaseProduct {
  is_trending?: boolean;
  tags?: string[];
  price_range?: { min: number; max: number };
}

// --- Context Management ---

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  isCritical?: boolean;  // pinned, never compacted
  metadata?: Record<string, unknown>;
}

export interface ContextBoundary {
  startIndex: number;
  endIndex: number;
  summary: string;
  compactedAt: number;
  originalTokenCount: number;
  compressedTokenCount: number;
}

export interface SessionState {
  sessionId: string;
  userId: string | null;
  messages: SessionMessage[];
  memoryIndex: MemoryIndex;
  compactedBoundaries: ContextBoundary[];
  createdAt: number;
  lastActivityAt: number;
  toolCallCount: number;
  toolCallsSinceLastCompact: number;
}

export interface MemoryIndex {
  userPreferences: UserPreferenceProfile;
  shoppingHistory: ShoppingEvent[];
  browseHistory: string[];  // product IDs
  currentIntent: string | null;
  styleContext: StyleContext;
  facts: Fact[];
  profile: UserPreferenceProfile;
}

export interface UserPreferenceProfile {
  preferredCategories: string[];
  preferredBrands: string[];
  priceRange: { min: number; max: number };
  sizeProfile: Record<string, string>;
  colorPreferences: string[];
  styleTags: string[];
  lastUpdated: number;
}

export interface StyleContext {
  occasion: string | null;
  season: string | null;
  budget: number | null;
  mood: string | null;
  constraints: string[];
}

export interface ShoppingEvent {
  type: 'view' | 'cart_add' | 'cart_remove' | 'purchase' | 'wishlist_add';
  productId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// --- Token Estimation ---

export const PROACTIVE_COMPACT_THRESHOLD = 167_000;  // ~80% of 200k context
export const REACTIVE_COMPACT_THRESHOLD = 200_000;   // hard limit
export const TOOL_CALL_COMPACT_THRESHOLD = 50;

// --- Reasoning Types (ToT/GoT/CoT) ---

export interface ChainOfThought {
  steps: CoTStep[];
  conclusion: string;
  confidence: number;  // 0-1
}

export interface CoTStep {
  step: number;
  reasoning: string;
  evidence: string[];
}

export interface TreeOfThought {
  root: ThoughtNode;
  branches: ThoughtBranch[];
  selectedPath: string[];  // node IDs
  pruningLog: PruningEntry[];
}

export interface ThoughtNode {
  id: string;
  parentId: string | null;
  thought: string;
  score: number;
  depth: number;
  children: string[];
}

export interface ThoughtBranch {
  id: string;
  path: string[];  // node IDs from root to leaf
  terminalScore: number;
  isComplete: boolean;
}

export interface PruningEntry {
  nodeId: string;
  reason: string;
  prunedAt: number;
}

export interface GraphOfThought {
  nodes: GoTNode[];
  edges: GoTEdge[];
  clusters: GoTCluster[];
  centralityScores: Record<string, number>;
}

export interface GoTNode {
  id: string;
  productId?: string;
  concept: string;
  type: 'product' | 'style' | 'occasion' | 'attribute';
  weight: number;
}

export interface GoTEdge {
  source: string;
  target: string;
  relation: 'complements' | 'alternatives' | 'co_occur' | 'stylistic_match';
  strength: number;
}

export interface GoTCluster {
  id: string;
  name: string;
  nodeIds: string[];
  centroid: Record<string, number>;
}

// --- MCTS Types ---

export interface MCTSNode {
  id: string;
  productId: string | null;
  state: RecommendationState;
  visits: number;
  value: number;
  children: string[];
  parentId: string | null;
  unexploredActions: string[];  // product IDs
}

export interface RecommendationState {
  selectedProducts: string[];
  budgetRemaining: number;
  styleScore: number;
  diversityScore: number;
  userFitScore: number;
}

export interface MCTSResult {
  selectedPath: string[];  // product IDs
  totalValue: number;
  simulationCount: number;
  confidence: number;
}

// --- OASIS-IS Search Types ---

export interface OasisQuery {
  raw: string;
  intent: SearchIntent;
  facets: SearchFacet[];
  constraints: SearchConstraint[];
  semanticEmbedding?: number[];
}

export type SearchIntent = 
  | 'direct_product'
  | 'category_browse'
  | 'style_inspiration'
  | 'occasion_based'
  | 'price_driven'
  | 'brand_specific'
  | 'trend_exploration'
  | 'outfit_completion';

export interface SearchFacet {
  type: 'category' | 'brand' | 'price' | 'size' | 'color' | 'occasion' | 'style';
  value: string;
  weight: number;
}

export interface SearchConstraint {
  type: 'must_have' | 'must_not_have' | 'prefer';
  attribute: string;
  value: string | number;
}

export interface PriceRangeConstraint {
  min: number;
  max: number;
}

export interface OasisResult {
  products: SearchResult[];
  intent: SearchIntent;
  appliedFacets: SearchFacet[];
  suggestions: SearchSuggestion[];
  totalCount: number;
}

export interface SearchResult {
  productId: string;
  score: number;
  matchReasons: string[];
  facets: Record<string, string[]>;
}

export interface SearchSuggestion {
  type: 'refine' | 'expand' | 'alternative' | 'complement';
  query: string;
  reason: string;
}

// --- AutoDream / Memory Consolidation ---

export interface DreamPhase {
  phase: 1 | 2 | 3 | 4;
  name: string;
  description: string;
}

export const DREAM_PHASES: DreamPhase[] = [
  { phase: 1, name: 'Prune', description: 'Remove contradictory preferences' },
  { phase: 2, name: 'Merge', description: 'Consolidate observations into facts' },
  { phase: 3, name: 'Analyze', description: 'Extract patterns with CoT reasoning' },
  { phase: 4, name: 'Compact', description: 'Format and reinject summary' },
];

export interface ConsolidationLock {
  pid: number;
  mtime: number;
  sessionId: string;
}

export interface SessionConsolidation {
  sessionId: string;
  lastConsolidatedAt: number;
  sessionsSinceConsolidation: number;
  compactedProfile: UserPreferenceProfile;
  rawObservations: Observation[];
  consolidatedFacts: Fact[];
}

export interface Observation {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}

export interface Fact {
  id: string;
  statement: string;
  confidence: number;
  supportingObservations: string[];  // observation IDs
  createdAt: number;
}

// --- Tick Loop Types ---

export interface TickResponse {
  wantsToAct: boolean;
  action?: TickAction;
  reason: string;
  estimatedTimeMs?: number;
}

export type TickAction = 
  | { type: 'recommend'; payload: RecommendationPayload }
  | { type: 'alert'; payload: AlertPayload }
  | { type: 'consolidate'; payload: ConsolidatePayload };

export interface RecommendationPayload {
  userId: string;
  products: string[];
  reason: string;
}

export interface AlertPayload {
  userId: string;
  type: 'price_drop' | 'restock' | 'deal' | 'style_match';
  message: string;
}

export interface ConsolidatePayload {
  sessionId: string;
}

export const MIN_HOURS_FOR_DREAM = 4;
export const MIN_SESSIONS_FOR_DREAM = 3;

// --- Feature Flags ---

export interface AgentFeatureFlags {
  marble_origami: boolean;        // context collapse mid-conversation
  proactive_compaction: boolean;   // proactive context management
  tot_reasoning: boolean;          // tree-of-thought recommendations
  got_reasoning: boolean;          // graph-of-thought product relations
  cot_reasoning: boolean;          // chain-of-thought explanations
  oasis_search: boolean;           // intelligent agentic search
  mcts_optimization: boolean;      // MCTS for recommendation selection
  autoDream: boolean;              // REM-style memory consolidation
  tick_loop: boolean;              // proactive assistant tick loop
}

// --- Reasoning Result (cross-module) ---
// Forward declarations to avoid circular imports.
// The actual implementations are in reasoning.ts.

export interface ChainOfThoughtRef {
  steps: Array<{ step: number; reasoning: string; evidence: string[] }>;
  conclusion: string;
  confidence: number;
}

export interface TreeOfThoughtRef {
  root: { id: string; thought: string; score: number };
  branches: Array<{ id: string; path: string[]; terminalScore: number }>;
  selectedPath: string[];
}

export interface GraphOfThoughtRef {
  nodes: Array<{ id: string; concept: string; type: string; weight: number }>;
  edges: Array<{ source: string; target: string; relation: string; strength: number }>;
  clusters: Array<{ id: string; name: string; nodeIds: string[] }>;
}

export interface ReasoningResult {
  cot?: ChainOfThoughtRef;
  tot?: TreeOfThoughtRef;
  got?: GraphOfThoughtRef;
  recommendation: string;
  alternatives: string[];
  confidence: number;
}

export const DEFAULT_FEATURE_FLAGS: AgentFeatureFlags = {
  marble_origami: true,
  proactive_compaction: true,
  tot_reasoning: true,
  got_reasoning: true,
  cot_reasoning: true,
  oasis_search: true,
  mcts_optimization: true,
  autoDream: true,
  tick_loop: true,
};
