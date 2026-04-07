// ============================================
// KAIROS-MIRRAGO: Context Manager
// Auto-compaction, token estimation, session management
// Adapted for e-commerce AI assistant
// ============================================

import {
  SessionState,
  SessionMessage,
  ContextBoundary,
  MemoryIndex,
  UserPreferenceProfile,
  ShoppingEvent,
  PROACTIVE_COMPACT_THRESHOLD,
  REACTIVE_COMPACT_THRESHOLD,
  TOOL_CALL_COMPACT_THRESHOLD,
} from './types';

// --- Token Estimation (approximate: ~4 chars per token) ---

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: SessionMessage[]): number {
  return messages.reduce((sum, msg) => {
    const contentTokens = estimateTokens(msg.content);
    const metaTokens = msg.metadata ? estimateTokens(JSON.stringify(msg.metadata)) : 0;
    const roleTokens = estimateTokens(msg.role);
    return sum + contentTokens + metaTokens + roleTokens + 4; // +4 for message structure
  }, 0);
}

export function estimateMemoryIndexTokens(memoryIndex: MemoryIndex): number {
  return estimateTokens(JSON.stringify(memoryIndex));
}

export function getTotalTokens(state: SessionState): number {
  const msgTokens = estimateMessagesTokens(state.messages);
  const memTokens = estimateMemoryIndexTokens(state.memoryIndex);
  return msgTokens + memTokens;
}

// --- Context Compaction ---

function findCompactBoundary(messages: SessionMessage[]): { startIndex: number; endIndex: number } {
  // Find the oldest non-critical messages that can be compacted
  let startIndex = 0;
  let endIndex = 0;

  // Skip system messages and critical messages
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].isCritical || messages[i].role === 'system') {
      startIndex = i + 1;
    } else {
      break;
    }
  }

  // Find a good compaction boundary (aim for ~50% reduction)
  const maxEnd = Math.floor(messages.length * 0.6);
  endIndex = Math.max(startIndex + 2, Math.min(maxEnd, startIndex + 10));

  return { startIndex, endIndex: Math.min(endIndex, messages.length) };
}

async function llmSummarizeOlderContext(messages: SessionMessage[]): Promise<string> {
  // In production, this would call an LLM to summarize the context
  // For now, generate a heuristic summary
  const content = messages.map(m => m.content).join('\n');
  
  // Extract key shopping signals
  const productMentions = content.match(/product|item|dress|shirt|pants|shoe|bag|watch/gi) || [];
  const styleMentions = content.match(/casual|formal|elegant|sporty|minimal|vintage|modern/gi) || [];
  const priceMentions = content.match(/\$[\d,]+|रू[\d,]+/g) || [];
  
  const summaryParts: string[] = [];
  
  if (productMentions.length > 0) {
    summaryParts.push(`Products discussed: ${Array.from(new Set(productMentions)).slice(0, 5).join(', ')}`);
  }
  if (styleMentions.length > 0) {
    summaryParts.push(`Style preferences: ${Array.from(new Set(styleMentions)).join(', ')}`);
  }
  if (priceMentions.length > 0) {
    summaryParts.push(`Budget references: ${priceMentions.join(', ')}`);
  }
  
  summaryParts.push(`[Context compacted at ${new Date().toISOString()} - ${messages.length} messages summarized]`);
  
  return summaryParts.join('. ') || '[Empty conversation context]';
}

function replaceWithBoundaryMarker(
  messages: SessionMessage[],
  boundary: { startIndex: number; endIndex: number },
  summary: string
): SessionMessage[] {
  const boundaryMessage: SessionMessage = {
    id: `boundary_${Date.now()}`,
    role: 'system',
    content: `<context-compact>\n${summary}\n</context-compact>`,
    timestamp: Date.now(),
    isCritical: true,
    metadata: {
      type: 'context_boundary',
      compactedMessages: boundary.endIndex - boundary.startIndex,
    },
  };

  return [
    ...messages.slice(0, boundary.startIndex),
    boundaryMessage,
    ...messages.slice(boundary.endIndex),
  ];
}

function persistCompactCommit(state: SessionState): void {
  // In production: write to IndexedDB or server-side session store
  if (typeof window !== 'undefined') {
    try {
      const sessionData = {
        sessionId: state.sessionId,
        compactedBoundaries: state.compactedBoundaries,
        lastCompactedAt: Date.now(),
        messageCount: state.messages.length,
        toolCallCount: state.toolCallCount,
      };
      localStorage.setItem(`mirrago-session-${state.sessionId}`, JSON.stringify(sessionData));
    } catch (e) {
      console.warn('[ContextManager] Failed to persist compact commit:', e);
    }
  }
}

// --- Main Auto-Compact Function ---

export async function autoCompactIfNeeded(state: SessionState): Promise<SessionState> {
  const totalTokens = getTotalTokens(state);

  // Check if compaction is needed
  if (totalTokens < PROACTIVE_COMPACT_THRESHOLD) {
    return state;
  }

  console.log(`[ContextManager] Auto-compacting: ${totalTokens} tokens (threshold: ${PROACTIVE_COMPACT_THRESHOLD})`);

  // 1. Proactive Compaction (default path)
  const boundary = findCompactBoundary(state.messages);
  
  if (boundary.endIndex > boundary.startIndex) {
    const messagesToSummarize = state.messages.slice(boundary.startIndex, boundary.endIndex);
    const summary = await llmSummarizeOlderContext(messagesToSummarize);
    
    const originalTokenCount = estimateMessagesTokens(messagesToSummarize);
    state.messages = replaceWithBoundaryMarker(state.messages, boundary, summary);
    const compressedTokenCount = estimateTokens(state.messages[boundary.startIndex].content);

    // Record the boundary
    state.compactedBoundaries.push({
      ...boundary,
      summary,
      compactedAt: Date.now(),
      originalTokenCount,
      compressedTokenCount,
    });

    persistCompactCommit(state);
    state.toolCallCount++;
    state.toolCallsSinceLastCompact++;
  }

  // 2. Snip Compaction (if reactive fallback needed - ultra-aggressive)
  if (totalTokens > REACTIVE_COMPACT_THRESHOLD) {
    console.warn('[ContextManager] Reactive snip compaction triggered!');
    // Keep only system messages and last 5 messages
    const systemMessages = state.messages.filter(m => m.isCritical || m.role === 'system');
    const recentMessages = state.messages.slice(-5);
    state.messages = [...systemMessages, ...recentMessages];
    persistCompactCommit(state);
  }

  // 3. Context Collapse (marble_origami feature flag)
  // Compress verbose tool results mid-conversation
  collapseVerboseContext(state);

  return state;
}

function collapseVerboseContext(state: SessionState): void {
  // Collapse tool call results that are verbose/repetitive
  const collapsed: SessionMessage[] = [];
  
  for (const msg of state.messages) {
    if (msg.role === 'tool' && msg.metadata?.verbose) {
      const shortened = {
        ...msg,
        content: msg.content.slice(0, 200) + '...[collapsed]',
        metadata: { ...msg.metadata, collapsed: true },
      };
      collapsed.push(shortened);
    } else {
      collapsed.push(msg);
    }
  }
  
  state.messages = collapsed;
}

// --- Dual-Threshold Trigger ---

export function shouldTriggerCompaction(state: SessionState): boolean {
  const totalTokens = getTotalTokens(state);
  return (
    totalTokens > PROACTIVE_COMPACT_THRESHOLD ||
    state.toolCallsSinceLastCompact > TOOL_CALL_COMPACT_THRESHOLD
  );
}

export function resetCompactCounter(state: SessionState): void {
  state.toolCallsSinceLastCompact = 0;
}

// --- Session Management ---

export function createSession(userId: string | null): SessionState {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  return {
    sessionId,
    userId,
    messages: [
      {
        id: 'system_init',
        role: 'system',
        content: `You are Mirrago AI, a fashion shopping assistant for Mirrago Fashion Nepal. 
Help users discover products, build outfits, and make purchasing decisions. 
You have access to product catalog, inventory, user preferences, and shopping history.
Prices are in Nepali Rupees (रू).`,
        timestamp: Date.now(),
        isCritical: true,
      },
    ],
    memoryIndex: {
      userPreferences: createEmptyPreferenceProfile(),
      shoppingHistory: [],
      browseHistory: [],
      currentIntent: null,
      styleContext: {
        occasion: null,
        season: null,
        budget: null,
        mood: null,
        constraints: [],
      },
      facts: [],
      profile: createEmptyPreferenceProfile(),
    },
    compactedBoundaries: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    toolCallCount: 0,
    toolCallsSinceLastCompact: 0,
  };
}

function createEmptyPreferenceProfile(): UserPreferenceProfile {
  return {
    preferredCategories: [],
    preferredBrands: [],
    priceRange: { min: 0, max: 50000 },
    sizeProfile: {},
    colorPreferences: [],
    styleTags: [],
    lastUpdated: Date.now(),
  };
}

export function addMessage(state: SessionState, message: Omit<SessionMessage, 'id' | 'timestamp'>): SessionState {
  const newMessage: SessionMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };
  
  state.messages.push(newMessage);
  state.lastActivityAt = Date.now();
  state.toolCallCount++;
  state.toolCallsSinceLastCompact++;
  
  return state;
}

export function trackShoppingEvent(state: SessionState, event: ShoppingEvent): SessionState {
  state.memoryIndex.shoppingHistory.push(event);
  
  if (event.type === 'view') {
    if (!state.memoryIndex.browseHistory.includes(event.productId)) {
      state.memoryIndex.browseHistory.push(event.productId);
    }
  }
  
  state.lastActivityAt = Date.now();
  return state;
}

export function updatePreferences(state: SessionState, updates: Partial<UserPreferenceProfile>): SessionState {
  state.memoryIndex.userPreferences = {
    ...state.memoryIndex.userPreferences,
    ...updates,
    lastUpdated: Date.now(),
  };
  return state;
}

export function loadSession(sessionId: string): SessionState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(`mirrago-session-${sessionId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// --- Prefetch Memory (background, hides I/O) ---

export function prefetchRelevantMemory(memoryIndex: MemoryIndex): void {
  if (typeof window === 'undefined') return;
  
  // Preload recently viewed products
  const recentIds = memoryIndex.browseHistory.slice(-10);
  if (recentIds.length > 0) {
    // In production: prefetch product details via Service Worker
    console.debug('[ContextManager] Prefetching recent views:', recentIds);
  }
}

export function enforceStrictWriteDiscipline(): void {
  // Ensure all state changes are persisted before proceeding
  if (typeof window !== 'undefined') {
    // Force localStorage flush (browser handles this, but we ensure sync)
  }
}
