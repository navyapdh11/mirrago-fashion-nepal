// ============================================
// KAIROS-MIRRAGO: Main Agent Orchestrator
// Unified interface for all AI reasoning capabilities
// ============================================

import {
  SessionState,
  UserPreferenceProfile,
  StyleContext,
  Product,
  AgentFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
  MCTSResult,
  OasisResult,
  SearchIntent,
  ReasoningResult,
} from './types';
import {
  createSession,
  addMessage,
  autoCompactIfNeeded,
  shouldTriggerCompaction,
  getTotalTokens,
  trackShoppingEvent,
  updatePreferences,
} from './contextManager';
import { generateReasoning } from './reasoning';
import type { ReasoningResult as ReasoningResultType } from './types';
import { runMCTS, getMCTSRecommendations } from './mcts';
import { searchProducts, parseQuery, executeOasisSearch } from './oasisSearch';
import { runAutoDream, shouldTriggerAutoDream, loadConsolidatedProfile } from './autoDream';
import { getTickLoop, KairosTickLoop, performSmartSearch } from './tickLoop';

// ============================================
// Agent Orchestrator Class
// ============================================

export interface AgentConfig {
  featureFlags?: Partial<AgentFeatureFlags>;
  mctsSimulations?: number;
  enableTickLoop?: boolean;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    duration: number;
    tokensUsed: number;
    reasoningApplied: string[];
  };
}

export class MirragoAgent {
  private state: SessionState;
  private featureFlags: AgentFeatureFlags;
  private tickLoop: KairosTickLoop | null = null;
  private products: Product[] = [];

  constructor(userId: string | null, config?: AgentConfig) {
    this.featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...config?.featureFlags };
    this.state = createSession(userId);

    // Load consolidated profile if available
    const { profile } = loadConsolidatedProfile();
    if (profile) {
      this.state.memoryIndex.userPreferences = profile;
    }

    // Start tick loop if enabled
    if (config?.enableTickLoop !== false) {
      this.tickLoop = getTickLoop();
    }
  }

  // ============================================
  // Session Management
  // ============================================

  getState(): SessionState {
    return this.state;
  }

  getSessionId(): string {
    return this.state.sessionId;
  }

  async addUserMessage(content: string): Promise<AgentResponse> {
    const start = Date.now();
    const reasoningApplied: string[] = [];

    try {
      addMessage(this.state, { role: 'user', content });

      // Auto-compact if needed
      if (shouldTriggerCompaction(this.state)) {
        this.state = await autoCompactIfNeeded(this.state);
        reasoningApplied.push('context_compaction');
      }

      const duration = Date.now() - start;
      return {
        success: true,
        metadata: {
          duration,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - start,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    }
  }

  // ============================================
  // Smart Search (OASIS-IS)
  // ============================================

  async search(query: string): Promise<AgentResponse & { result?: OasisResult }> {
    const start = Date.now();
    const reasoningApplied: string[] = [];

    try {
      if (!this.featureFlags.oasis_search) {
        return {
          success: false,
          error: 'OASIS-IS search is disabled',
          metadata: {
            duration: Date.now() - start,
            tokensUsed: getTotalTokens(this.state),
            reasoningApplied: [],
          },
        };
      }

      const preferences = this.state.memoryIndex.userPreferences;
      const result = performSmartSearch(query, this.products, preferences);

      // Track as observation
      trackShoppingEvent(this.state, {
        type: 'view',
        productId: `search:${query}`,
        timestamp: Date.now(),
        metadata: { query, resultCount: result.totalCount },
      });

      reasoningApplied.push('oasis_is_search');

      const duration = Date.now() - start;
      return {
        success: true,
        data: result,
        metadata: {
          duration,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - start,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    }
  }

  // ============================================
  // Product Recommendations (MCTS + Reasoning)
  // ============================================

  async getRecommendations(
    options: {
      count?: number;
      context?: Partial<StyleContext>;
      useMCTS?: boolean;
      includeReasoning?: boolean;
    } = {}
  ): Promise<AgentResponse & { recommendations?: Product[]; reasoning?: ReasoningResult[] }> {
    const start = Date.now();
    const reasoningApplied: string[] = [];

    const {
      count = 5,
      context = {},
      useMCTS = this.featureFlags.mcts_optimization,
      includeReasoning = this.featureFlags.cot_reasoning,
    } = options;

    try {
      const preferences = this.state.memoryIndex.userPreferences;
      const styleContext: StyleContext = {
        ...this.state.memoryIndex.styleContext,
        ...context,
      };

      let recommendedProducts: Product[];
      const reasoningResults: ReasoningResult[] = [];

      if (useMCTS && this.products.length > 0) {
        // Use MCTS for optimal selection
        const mctsResult = getMCTSRecommendations(
          this.products,
          preferences,
          styleContext,
          count
        );
        recommendedProducts = mctsResult.products;
        reasoningApplied.push('mcts_optimization');
      } else {
        // Fallback: simple preference-based filtering
        recommendedProducts = this.products
          .filter(p => preferences.preferredCategories.includes(p.category))
          .slice(0, count);
      }

      // Generate reasoning for top products
      if (includeReasoning && recommendedProducts.length > 0) {
        if (this.featureFlags.tot_reasoning) {
          reasoningApplied.push('tree_of_thought');
        }
        if (this.featureFlags.got_reasoning) {
          reasoningApplied.push('graph_of_thought');
        }

        for (const product of recommendedProducts.slice(0, 3)) {
          const reasoning = await generateReasoning(
            product,
            this.products,
            preferences,
            styleContext,
            this.featureFlags.tot_reasoning,
            this.featureFlags.got_reasoning
          );
          reasoningResults.push(reasoning);
        }

        reasoningApplied.push('chain_of_thought');
      }

      // Track as observation
      trackShoppingEvent(this.state, {
        type: 'view',
        productId: 'recommendation_request',
        timestamp: Date.now(),
        metadata: { count, useMCTS },
      });

      const duration = Date.now() - start;
      return {
        success: true,
        data: {
          products: recommendedProducts,
          reasoning: reasoningResults,
        },
        metadata: {
          duration,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - start,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    }
  }

  // ============================================
  // Product Detail with Reasoning
  // ============================================

  async getProductWithReasoning(productId: string): Promise<AgentResponse & { product?: Product; reasoning?: ReasoningResult }> {
    const start = Date.now();
    const reasoningApplied: string[] = [];

    try {
      const product = this.products.find(p => String(p.id) === String(productId));
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          metadata: {
            duration: Date.now() - start,
            tokensUsed: getTotalTokens(this.state),
            reasoningApplied,
          },
        };
      }

      const preferences = this.state.memoryIndex.userPreferences;
      const styleContext = this.state.memoryIndex.styleContext;

      let reasoning: ReasoningResult | undefined;
      if (this.featureFlags.cot_reasoning) {
        reasoning = await generateReasoning(
          product,
          this.products,
          preferences,
          styleContext,
          this.featureFlags.tot_reasoning,
          this.featureFlags.got_reasoning
        );
        reasoningApplied.push('chain_of_thought');
        if (this.featureFlags.tot_reasoning) reasoningApplied.push('tree_of_thought');
        if (this.featureFlags.got_reasoning) reasoningApplied.push('graph_of_thought');
      }

      // Track view
      trackShoppingEvent(this.state, {
        type: 'view',
        productId,
        timestamp: Date.now(),
      });

      const duration = Date.now() - start;
      return {
        success: true,
        data: { product, reasoning },
        metadata: {
          duration,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - start,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    }
  }

  // ============================================
  // Cart Actions
  // ============================================

  async addToCart(productId: string): Promise<AgentResponse> {
    const start = Date.now();
    const reasoningApplied: string[] = [];

    try {
      trackShoppingEvent(this.state, {
        type: 'cart_add',
        productId,
        timestamp: Date.now(),
      });

      reasoningApplied.push('shopping_event_tracking');

      const duration = Date.now() - start;
      return {
        success: true,
        metadata: {
          duration,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - start,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    }
  }

  // ============================================
  // Preference Learning
  // ============================================

  async learnPreferences(updates: Partial<UserPreferenceProfile>): Promise<AgentResponse> {
    const start = Date.now();
    const reasoningApplied: string[] = [];

    try {
      updatePreferences(this.state, updates);
      reasoningApplied.push('preference_update');

      // Trigger autoDream if conditions met
      if (shouldTriggerAutoDream() && this.featureFlags.autoDream) {
        await runAutoDream(
          this.state.memoryIndex.shoppingHistory.map(e => ({
            type: e.type,
            data: { productId: e.productId, ...e.metadata },
            timestamp: e.timestamp,
            sessionId: this.state.sessionId,
          })),
          [],
          this.state.memoryIndex.userPreferences
        );
        reasoningApplied.push('autoDream_consolidation');
      }

      const duration = Date.now() - start;
      return {
        success: true,
        metadata: {
          duration,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - start,
          tokensUsed: getTotalTokens(this.state),
          reasoningApplied,
        },
      };
    }
  }

  // ============================================
  // Tick Loop Management
  // ============================================

  startTickLoop(onAction?: (action: any) => void): void {
    if (this.tickLoop) {
      this.tickLoop.start(
        this.state,
        this.products,
        onAction,
        (msg) => console.log(`[Agent] ${msg}`)
      );
    }
  }

  stopTickLoop(): void {
    if (this.tickLoop) {
      this.tickLoop.stop();
    }
  }

  // ============================================
  // Product Catalog Management
  // ============================================

  setProducts(products: Product[]): void {
    this.products = products;
    this.tickLoop?.updateProducts(products);
  }

  getProducts(): Product[] {
    return this.products;
  }

  // ============================================
  // Style Context
  // ============================================

  setStyleContext(context: Partial<StyleContext>): void {
    this.state.memoryIndex.styleContext = {
      ...this.state.memoryIndex.styleContext,
      ...context,
    };
  }

  // ============================================
  // Statistics
  // ============================================

  getStats(): {
    sessionId: string;
    messageCount: number;
    tokenCount: number;
    shoppingEvents: number;
    compactedBoundaries: number;
    preferences: UserPreferenceProfile;
  } {
    return {
      sessionId: this.state.sessionId,
      messageCount: this.state.messages.length,
      tokenCount: getTotalTokens(this.state),
      shoppingEvents: this.state.memoryIndex.shoppingHistory.length,
      compactedBoundaries: this.state.compactedBoundaries.length,
      preferences: this.state.memoryIndex.userPreferences,
    };
  }
}

// ============================================
// Factory Function
// ============================================

export function createAgent(
  userId: string | null,
  config?: AgentConfig
): MirragoAgent {
  return new MirragoAgent(userId, config);
}

// ============================================
// Type Exports (re-export for convenience)
// ============================================

export type {
  SessionState,
  UserPreferenceProfile,
  StyleContext,
  Product,
  AgentFeatureFlags,
  MCTSResult,
  OasisResult,
  SearchIntent,
  ReasoningResult,
};

export {
  DEFAULT_FEATURE_FLAGS,
  searchProducts,
  getMCTSRecommendations,
  runAutoDream,
  generateReasoning,
  performSmartSearch,
};
