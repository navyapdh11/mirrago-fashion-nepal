// ============================================
// KAIROS-MIRRAGO: AutoDream Memory Consolidation
// REM-style 4-phase memory consolidation
// Adapts sleeping memory patterns for user preferences
// ============================================

import {
  SessionConsolidation,
  UserPreferenceProfile,
  Observation,
  Fact,
  ShoppingEvent,
  DreamPhase,
  DREAM_PHASES,
  ConsolidationLock,
  MIN_HOURS_FOR_DREAM,
  MIN_SESSIONS_FOR_DREAM,
} from './types';

// ============================================
// Lock Management
// ============================================

const LOCK_KEY = 'mirrago-consolidation-lock';

function acquireLock(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const existing = localStorage.getItem(LOCK_KEY);
    if (existing) {
      const lock: ConsolidationLock = JSON.parse(existing);
      // Check if lock is stale (older than 1 hour)
      if (Date.now() - lock.mtime < 3600000) {
        return false;  // Another process holds the lock
      }
    }

    const newLock: ConsolidationLock = {
      pid: Date.now(),
      mtime: Date.now(),
      sessionId: `session_${Date.now()}`,
    };

    localStorage.setItem(LOCK_KEY, JSON.stringify(newLock));
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCK_KEY);
}

function rollbackLockMtime(): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = localStorage.getItem(LOCK_KEY);
    if (existing) {
      const lock: ConsolidationLock = JSON.parse(existing);
      lock.mtime = Date.now() - 3600000;  // Make it appear stale
      localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
    }
  } catch {
    // Ignore errors
  }
}

// ============================================
// Phase 1: Prune Contradictions
// ============================================

interface ContradictionReport {
  observationIds: string[];
  conflict: string;
  resolution: 'keep_newer' | 'keep_higher_confidence' | 'merge';
}

function pruneContradictions(observations: Observation[]): {
  kept: Observation[];
  pruned: Observation[];
  reports: ContradictionReport[];
} {
  const reports: ContradictionReport[] = [];
  const prunedIds = new Set<string>();
  const kept: Observation[] = [];

  // Group observations by type
  const byType = new Map<string, Observation[]>();
  for (const obs of observations) {
    if (!byType.has(obs.type)) {
      byType.set(obs.type, []);
    }
    byType.get(obs.type)!.push(obs);
  }

  // Detect contradictions within each type
  for (const type of Array.from(byType.keys())) {
    const obsList = byType.get(type)!;
    if (obsList.length <= 1) continue;

    // Sort by timestamp (newest first)
    obsList.sort((a, b) => b.timestamp - a.timestamp);

    // Check for conflicting values
    const valueMap = new Map<string, Observation[]>();
    for (const obs of obsList) {
      const key = JSON.stringify(obs.data);
      if (!valueMap.has(key)) {
        valueMap.set(key, []);
      }
      valueMap.get(key)!.push(obs);
    }

    // If multiple distinct values exist, it's a contradiction
    if (valueMap.size > 1) {
      const allObs = obsList;
      const newest = allObs[0];
      const older = allObs.slice(1);

      reports.push({
        observationIds: allObs.map(o => String(o.timestamp)),
        conflict: `Contradictory ${type} observations: ${valueMap.size} distinct values`,
        resolution: 'keep_newer',
      });

      // Keep newest, mark older for pruning
      for (const obs of older) {
        prunedIds.add(String(obs.timestamp));
      }
    }
  }

  // Filter kept/pruned
  for (const obs of observations) {
    if (prunedIds.has(String(obs.timestamp))) {
      // Skip (pruned)
    } else {
      kept.push(obs);
    }
  }

  return {
    kept,
    pruned: observations.filter(o => prunedIds.has(String(o.timestamp))),
    reports,
  };
}

// ============================================
// Phase 2: Merge Observations → Facts
// ============================================

function mergeObservationsToFacts(
  observations: Observation[],
  existingFacts: Fact[]
): Fact[] {
  const newFacts: Fact[] = [];
  let factIdCounter = existingFacts.length;

  // Group observations by semantic similarity
  const groups = clusterObservations(observations);

  for (const group of groups) {
    if (group.length < 1) continue;

    // Extract common pattern
    const statement = extractFactStatement(group);
    const confidence = calculateFactConfidence(group);

    // Check if this fact already exists
    const existingMatch = existingFacts.find(f =>
      f.statement.toLowerCase().includes(statement.toLowerCase().slice(0, 30))
    );

    if (existingMatch) {
      // Update existing fact with new observations
      existingMatch.confidence = Math.min(
        1.0,
        existingMatch.confidence + (confidence * 0.1)
      );
    } else {
      newFacts.push({
        id: `fact_${factIdCounter++}`,
        statement,
        confidence,
        supportingObservations: group.map(o => String(o.timestamp)),
        createdAt: Date.now(),
      });
    }
  }

  return [...existingFacts, ...newFacts];
}

function clusterObservations(observations: Observation[]): Observation[][] {
  const clusters: Observation[][] = [];

  for (const obs of observations) {
    let added = false;

    for (const cluster of clusters) {
      if (isSimilar(obs, cluster[0])) {
        cluster.push(obs);
        added = true;
        break;
      }
    }

    if (!added) {
      clusters.push([obs]);
    }
  }

  return clusters;
}

function isSimilar(a: Observation, b: Observation): boolean {
  if (a.type !== b.type) return false;

  // Compare data keys
  const keysA = Object.keys(a.data);
  const keysB = Object.keys(b.data);
  
  const sharedKeys = keysA.filter(k => keysB.includes(k));
  if (sharedKeys.length === 0) return false;

  // Check if values are similar
  let matchCount = 0;
  for (const key of sharedKeys) {
    if (String(a.data[key]).toLowerCase().includes(String(b.data[key]).toLowerCase()) ||
        String(b.data[key]).toLowerCase().includes(String(a.data[key]).toLowerCase())) {
      matchCount++;
    }
  }

  return matchCount / sharedKeys.length > 0.5;
}

function extractFactStatement(observations: Observation[]): string {
  if (observations.length === 0) return 'Unknown pattern';

  const first = observations[0];
  const count = observations.length;

  switch (first.type) {
    case 'product_view':
      return `User shows interest in ${getCommonAttribute(observations, 'category') || 'products'}`;
    case 'cart_add':
      return `User tends to add ${getCommonAttribute(observations, 'category') || 'items'} to cart`;
    case 'purchase':
      return `User purchases ${getCommonAttribute(observations, 'category') || 'products'} regularly`;
    case 'style_preference':
      return `User prefers ${getCommonAttribute(observations, 'style') || 'certain'} styles`;
    case 'price_sensitivity':
      return `User is price-conscious, prefers items under ${getCommonAttribute(observations, 'price_range') || 'budget'}`;
    default:
      return `Pattern observed: ${first.type} (${count} occurrences)`;
  }
}

function getCommonAttribute(observations: Observation[], attr: string): string | null {
  const values = observations
    .map(o => o.data[attr])
    .filter(Boolean) as string[];
  
  if (values.length === 0) return null;

  // Return most common value
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  let maxCount = 0;
  let maxVal = values[0];
  for (const val of Array.from(counts.keys())) {
    const count = counts.get(val)!;
    if (count > maxCount) {
      maxCount = count;
      maxVal = val;
    }
  }

  return maxVal;
}

function calculateFactConfidence(observations: Observation[]): number {
  if (observations.length === 0) return 0;

  // Base confidence from observation count
  const countConfidence = Math.min(observations.length / 5, 0.7);

  // Recency bonus
  const now = Date.now();
  const avgAge = observations.reduce(
    (sum, o) => sum + (now - o.timestamp),
    0
  ) / observations.length;
  
  const recencyBonus = Math.max(0, 1 - avgAge / (7 * 24 * 3600000)) * 0.3;  // 1 week decay

  return Math.min(countConfidence + recencyBonus, 1.0);
}

// ============================================
// Phase 3: Analyze with CoT Reasoning
// ============================================

interface AnalysisResult {
  pattern: string;
  evidence: string[];
  confidence: number;
  actionable: boolean;
}

function analyzeWithCoT(facts: Fact[]): AnalysisResult[] {
  const analyses: AnalysisResult[] = [];

  // Look for preference patterns
  const categoryFacts = facts.filter(f => f.statement.toLowerCase().includes('interest in') || f.statement.toLowerCase().includes('add'));
  const priceFacts = facts.filter(f => f.statement.toLowerCase().includes('price'));
  const styleFacts = facts.filter(f => f.statement.toLowerCase().includes('style') || f.statement.toLowerCase().includes('prefer'));

  if (categoryFacts.length > 0) {
    const topCategories = categoryFacts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    analyses.push({
      pattern: `Primary interest categories: ${topCategories.map(f => f.statement.split(' ').slice(-2).join(' ')).join(', ')}`,
      evidence: topCategories.map(f => `${f.statement} (confidence: ${f.confidence.toFixed(2)})`),
      confidence: topCategories.reduce((sum, f) => sum + f.confidence, 0) / topCategories.length,
      actionable: true,
    });
  }

  if (priceFacts.length > 0) {
    analyses.push({
      pattern: 'Price sensitivity detected',
      evidence: priceFacts.map(f => f.statement),
      confidence: priceFacts[0].confidence,
      actionable: true,
    });
  }

  if (styleFacts.length > 0) {
    analyses.push({
      pattern: `Style preferences identified: ${styleFacts.map(f => f.statement).join('; ')}`,
      evidence: styleFacts.map(f => `${f.statement} (${(f.confidence * 100).toFixed(0)}% confidence)`),
      confidence: styleFacts.reduce((sum, f) => sum + f.confidence, 0) / styleFacts.length,
      actionable: true,
    });
  }

  return analyses;
}

// ============================================
// Phase 4: Compact and Reinforce
// ============================================

function compactUserProfile(
  facts: Fact[],
  analyses: AnalysisResult[],
  currentProfile: UserPreferenceProfile
): UserPreferenceProfile {
  const updated = { ...currentProfile };

  // Extract categories from facts
  for (const fact of facts) {
    if (fact.confidence < 0.5) continue;

    if (fact.statement.toLowerCase().includes('interest')) {
      const words = fact.statement.split(' ');
      const lastWord = words[words.length - 1];
      if (!updated.preferredCategories.includes(lastWord)) {
        updated.preferredCategories.push(lastWord);
      }
    }

    if (fact.statement.toLowerCase().includes('price')) {
      // Extract price range from statement
      const priceMatch = fact.statement.match(/under\s*रू\s*(\d+)/i);
      if (priceMatch) {
        updated.priceRange.max = parseInt(priceMatch[1], 10);
      }
    }
  }

  // Extract styles from analyses
  for (const analysis of analyses) {
    if (analysis.pattern.toLowerCase().includes('style')) {
      const styleKeywords = analysis.pattern.match(/\b(modern|vintage|classic|minimal|sporty|elegant|trendy|casual|formal)\b/gi);
      if (styleKeywords) {
        for (const style of styleKeywords) {
          const lowerStyle = style.toLowerCase();
          if (!updated.styleTags.includes(lowerStyle)) {
            updated.styleTags.push(lowerStyle);
          }
        }
      }
    }
  }

  updated.lastUpdated = Date.now();
  return updated;
}

// ============================================
// Main AutoDream Orchestration
// ============================================

export interface AutoDreamResult {
  phases: DreamPhase[];
  factsConsolidated: number;
  contradictionsPruned: number;
  updatedProfile: UserPreferenceProfile;
  duration: number;
}

export async function runAutoDream(
  observations: Observation[],
  existingFacts: Fact[],
  currentProfile: UserPreferenceProfile
): Promise<AutoDreamResult> {
  const startTime = Date.now();
  const phases: DreamPhase[] = [];

  if (!acquireLock()) {
    console.warn('[AutoDream] Could not acquire lock, skipping consolidation');
    return {
      phases: [],
      factsConsolidated: 0,
      contradictionsPruned: 0,
      updatedProfile: currentProfile,
      duration: 0,
    };
  }

  try {
    // Phase 1: Prune contradictions
    phases.push(DREAM_PHASES[0]);
    const { kept, pruned, reports } = pruneContradictions(observations);
    console.log(`[AutoDream] Phase 1: Pruned ${pruned.length} contradictory observations`);

    // Phase 2: Merge observations into facts
    phases.push(DREAM_PHASES[1]);
    const consolidatedFacts = mergeObservationsToFacts(kept, existingFacts);
    const newFactsCount = consolidatedFacts.length - existingFacts.length;
    console.log(`[AutoDream] Phase 2: Consolidated ${newFactsCount} new facts (${consolidatedFacts.length} total)`);

    // Phase 3: Analyze with CoT
    phases.push(DREAM_PHASES[2]);
    const analyses = analyzeWithCoT(consolidatedFacts);
    console.log(`[AutoDream] Phase 3: Generated ${analyses.length} CoT analyses`);

    // Phase 4: Compact and update profile
    phases.push(DREAM_PHASES[3]);
    const updatedProfile = compactUserProfile(consolidatedFacts, analyses, currentProfile);
    console.log('[AutoDream] Phase 4: Updated user preference profile');

    // Persist consolidated state
    persistConsolidation(consolidatedFacts, updatedProfile);

    const duration = Date.now() - startTime;

    return {
      phases,
      factsConsolidated: newFactsCount,
      contradictionsPruned: pruned.length,
      updatedProfile,
      duration,
    };
  } catch (error) {
    console.error('[AutoDream] Error during consolidation:', error);
    rollbackLockMtime();
    throw error;
  } finally {
    releaseLock();
  }
}

function persistConsolidation(
  facts: Fact[],
  profile: UserPreferenceProfile
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('mirrago-facts', JSON.stringify(facts));
    localStorage.setItem('mirrago-user-profile', JSON.stringify(profile));
    localStorage.setItem('mirrago-last-consolidated', String(Date.now()));
  } catch (e) {
    console.warn('[AutoDream] Failed to persist consolidation:', e);
  }
}

export function loadConsolidatedProfile(): {
  profile: UserPreferenceProfile | null;
  facts: Fact[];
  lastConsolidated: number | null;
} {
  if (typeof window === 'undefined') {
    return { profile: null, facts: [], lastConsolidated: null };
  }

  try {
    const profileStr = localStorage.getItem('mirrago-user-profile');
    const factsStr = localStorage.getItem('mirrago-facts');
    const lastStr = localStorage.getItem('mirrago-last-consolidated');

    return {
      profile: profileStr ? JSON.parse(profileStr) : null,
      facts: factsStr ? JSON.parse(factsStr) : [],
      lastConsolidated: lastStr ? parseInt(lastStr, 10) : null,
    };
  } catch {
    return { profile: null, facts: [], lastConsolidated: null };
  }
}

export function hoursSinceLastConsolidated(): number {
  const { lastConsolidated } = loadConsolidatedProfile();
  if (!lastConsolidated) return Infinity;
  return (Date.now() - lastConsolidated) / 3600000;
}

export function shouldTriggerAutoDream(): boolean {
  const hours = hoursSinceLastConsolidated();
  return hours >= MIN_HOURS_FOR_DREAM && acquireLock();
}
