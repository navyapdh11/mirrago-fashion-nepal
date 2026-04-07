// ============================================
// KAIROS-MIRRAGO: AI Agent Tick Loop
// Proactive daemon that periodically checks for actions
// Adapted for e-commerce assistant (replaces background cron)
// ============================================

import {
  TickResponse,
  TickAction,
  SessionState,
  UserPreferenceProfile,
  ShoppingEvent,
  Product,
  Observation,
} from './types';
import { autoCompactIfNeeded, shouldTriggerCompaction } from './contextManager';
import { runAutoDream, shouldTriggerAutoDream } from './autoDream';
import { searchProducts } from './oasisSearch';

// ============================================
// Tick Loop Configuration
// ============================================

interface TickLoopConfig {
  intervalMs: number;           // How often to tick (default: 5 minutes)
  maxBudgetMs: number;          // Max time per tick (default: 15s)
  enabled: boolean;
}

const DEFAULT_CONFIG: TickLoopConfig = {
  intervalMs: 5 * 60 * 1000,  // 5 minutes
  maxBudgetMs: 15000,           // 15 seconds
  enabled: true,
};

export class KairosTickLoop {
  private config: TickLoopConfig;
  private running: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private state: SessionState | null = null;
  private products: Product[] = [];
  private observations: Observation[] = [];
  private onAction?: (action: TickAction) => void;
  private onLog?: (message: string) => void;

  constructor(config?: Partial<TickLoopConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // Lifecycle
  // ============================================

  start(
    state: SessionState,
    products: Product[],
    onAction?: (action: TickAction) => void,
    onLog?: (message: string) => void
  ): void {
    if (this.running) return;

    this.state = state;
    this.products = products;
    this.onAction = onAction;
    this.onLog = onLog;
    this.running = true;

    this.log('Tick loop started');

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.intervalMs);

    // Run first tick immediately
    setTimeout(() => this.tick(), 1000);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.log('Tick loop stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============================================
  // Main Tick Handler
  // ============================================

  private async tick(): Promise<void> {
    if (!this.running || !this.state) return;

    const tickStart = Date.now();
    this.log('Tick started');

    try {
      // 1. Context compaction check
      if (shouldTriggerCompaction(this.state)) {
        this.state = await autoCompactIfNeeded(this.state);
        this.log('Context compaction performed');
      }

      // 2. AutoDream / Memory consolidation check
      if (shouldTriggerAutoDream()) {
        await this.performAutoDream();
      }

      // 3. Proactive action decision
      const tickResponse = await this.decideProactiveAction();
      
      if (tickResponse.wantsToAct && tickResponse.action) {
        // Check if we're within budget
        const estimatedTime = Date.now() - tickStart;
        if (estimatedTime + (tickResponse.estimatedTimeMs || 0) <= this.config.maxBudgetMs) {
          this.executeAction(tickResponse.action);
        } else {
          this.log(`Skipping action (would exceed budget): ${tickResponse.reason}`);
        }
      } else {
        this.log(`Quiet tick: ${tickResponse.reason}`);
      }

      // 4. Process pending observations
      this.processObservations();

    } catch (error) {
      console.error('[TickLoop] Error during tick:', error);
    }

    const duration = Date.now() - tickStart;
    this.log(`Tick completed in ${duration}ms`);
  }

  // ============================================
  // Proactive Decision Making
  // ============================================

  private async decideProactiveAction(): Promise<TickResponse> {
    if (!this.state) {
      return { wantsToAct: false, reason: 'No active session' };
    }

    const { userPreferences, shoppingHistory, browseHistory } = this.state.memoryIndex;

    // Check for proactive recommendation opportunity
    const recentActivity = shoppingHistory.filter(
      event => Date.now() - event.timestamp < 30 * 60 * 1000  // Last 30 minutes
    );

    // If user browsed but didn't purchase, recommend similar items
    if (browseHistory.length > 0 && recentActivity.length > 0) {
      const hasRecentPurchase = recentActivity.some(e => e.type === 'purchase');
      const hasRecentView = recentActivity.some(e => e.type === 'view');

      if (hasRecentView && !hasRecentPurchase) {
        return {
          wantsToAct: true,
          action: {
            type: 'recommend',
            payload: {
              userId: this.state.userId || 'anonymous',
              products: browseHistory.slice(-5),
              reason: 'Based on your recent browsing activity',
            },
          },
          reason: 'User browsed without purchasing - recommend similar items',
          estimatedTimeMs: 2000,
        };
      }
    }

    // If user has price-sensitive preferences, alert on deals
    if (userPreferences.priceRange.max < 10000) {
      const discountedProducts = this.products.filter(
        p => p.discount_percentage && p.discount_percentage > 20 && p.price <= userPreferences.priceRange.max
      );

      if (discountedProducts.length > 0) {
        return {
          wantsToAct: true,
          action: {
            type: 'alert',
            payload: {
              userId: this.state.userId || 'anonymous',
              type: 'deal',
              message: `${discountedProducts.length} items on sale within your budget!`,
            },
          },
          reason: 'Price-conscious user has deals available',
          estimatedTimeMs: 1000,
        };
      }
    }

    // Style match alert (new items matching preferences)
    if (userPreferences.styleTags.length > 0) {
      const matchingProducts = this.products.filter(p =>
        ((p.tags || p.style_tags) || []).some((tag: string) => userPreferences.styleTags.includes(tag))
      );

      if (matchingProducts.length > 10) {
        return {
          wantsToAct: true,
          action: {
            type: 'alert',
            payload: {
              userId: this.state.userId || 'anonymous',
              type: 'style_match',
              message: `New ${userPreferences.styleTags[0]} items available`,
            },
          },
          reason: 'Style preferences match new inventory',
          estimatedTimeMs: 1000,
        };
      }
    }

    // Stay quiet
    return {
      wantsToAct: false,
      reason: 'No actionable signals detected',
      estimatedTimeMs: 0,
    };
  }

  private executeAction(action: TickAction): void {
    this.log(`Executing action: ${action.type}`);

    switch (action.type) {
      case 'recommend':
        this.handleRecommendAction(action.payload);
        break;
      case 'alert':
        this.handleAlertAction(action.payload);
        break;
      case 'consolidate':
        this.handleConsolidateAction(action.payload);
        break;
    }

    if (this.onAction) {
      this.onAction(action);
    }
  }

  private handleRecommendAction(payload: any): void {
    if (!this.state || this.products.length === 0) return;

    // Use MCTS to find best recommendations
    const recentProducts = payload.products
      .map((id: string) => this.products.find(p => String(p.id) === id))
      .filter(Boolean);

    if (recentProducts.length > 0) {
      const categories = Array.from(new Set(recentProducts.map((p: Product) => p.category)));
      const similarProducts = this.products.filter(
        p => categories.includes(p.category) && !payload.products.includes(p.id)
      ).slice(0, 5);

      this.log(`Recommendation: ${similarProducts.map((p: Product) => p.name).join(', ')}`);
    }
  }

  private handleAlertAction(payload: any): void {
    this.log(`Alert: ${payload.message}`);
    // In production: trigger push notification, in-app toast, etc.
  }

  private handleConsolidateAction(_payload: any): void {
    this.performAutoDream();
  }

  // ============================================
  // AutoDream Integration
  // ============================================

  private async performAutoDream(): Promise<void> {
    if (!this.state) return;

    try {
      const profile = this.state.memoryIndex.userPreferences;
      const facts = this.state.memoryIndex.facts || [];

      // Convert shopping history to observations
      const observations: Observation[] = this.state.memoryIndex.shoppingHistory.map(event => ({
        type: event.type,
        data: {
          productId: event.productId,
          ...event.metadata,
        },
        timestamp: event.timestamp,
        sessionId: this.state!.sessionId,
      }));

      const result = await runAutoDream(observations, facts, profile);

      // Update state with consolidated profile
      this.state.memoryIndex.userPreferences = result.updatedProfile;
      this.state.memoryIndex.facts = result.updatedProfile.lastUpdated > 0 ? [] : this.state.memoryIndex.facts;

      this.log(`AutoDream: ${result.factsConsolidated} facts consolidated, ${result.contradictionsPruned} contradictions pruned`);
    } catch (error) {
      console.error('[TickLoop] AutoDream failed:', error);
    }
  }

  // ============================================
  // Observation Processing
  // ============================================

  private processObservations(): void {
    if (this.observations.length === 0) return;

    // Process and clear observations
    this.observations = [];
  }

  addObservation(observation: Observation): void {
    this.observations.push(observation);
  }

  // ============================================
  // Utility
  // ============================================

  private log(message: string): void {
    if (this.onLog) {
      this.onLog(message);
    } else {
      console.log(`[TickLoop] ${message}`);
    }
  }

  updateProducts(products: Product[]): void {
    this.products = products;
  }

  updateState(state: SessionState): void {
    this.state = state;
  }
}

// ============================================
// Quick Search Integration
// ============================================

export function performSmartSearch(
  query: string,
  products: Product[],
  preferences: UserPreferenceProfile
): any {
  const results = searchProducts(query, products, preferences);

  // Enrich with intent-aware UI hints
  const uiHints: string[] = [];

  switch (results.intent) {
    case 'price_driven':
      uiHints.push('Showing items within your budget');
      break;
    case 'occasion_based':
      uiHints.push(`Curated for ${results.appliedFacets.find(f => f.type === 'occasion')?.value || 'your occasion'}`);
      break;
    case 'style_inspiration':
      uiHints.push('Trending styles for you');
      break;
    case 'outfit_completion':
      uiHints.push('Items that work well together');
      break;
  }

  if (results.suggestions.length > 0) {
    uiHints.push(`Try: "${results.suggestions[0].query}"`);
  }

  return {
    ...results,
    uiHints,
  };
}

// ============================================
// Singleton Instance (for browser persistence)
// ============================================

let tickLoopInstance: KairosTickLoop | null = null;

export function getTickLoop(): KairosTickLoop {
  if (!tickLoopInstance) {
    tickLoopInstance = new KairosTickLoop();
  }
  return tickLoopInstance;
}
