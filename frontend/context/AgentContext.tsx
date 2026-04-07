// KAIROS-MIRRAGO: Agent Context Provider
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { MirragoAgent, createAgent } from '@/lib/agent';
import type { UserPreferenceProfile, Product } from '@/lib/agent/types';

interface AgentContextValue {
  agent: MirragoAgent | null;
  isReady: boolean;
  sessionId: string | null;
  stats: { messageCount: number; tokenCount: number; shoppingEvents: number } | null;
  sendMessage: (message: string) => Promise<void>;
  searchProducts: (query: string) => Promise<any>;
  getRecommendations: (options?: any) => Promise<any>;
  getProductDetail: (productId: string) => Promise<any>;
  trackCartAdd: (productId: string) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferenceProfile>) => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

interface AgentProviderProps {
  children: ReactNode;
  userId?: string | null;
  products: Product[];
}

export function AgentProvider({ children, userId, products }: AgentProviderProps) {
  const [agent, setAgent] = useState<MirragoAgent | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<AgentContextValue['stats']>(null);
  const agentRef = useRef<MirragoAgent | null>(null);

  useEffect(() => {
    const newAgent = createAgent(userId || null);
    newAgent.setProducts(products);
    setAgent(newAgent);
    agentRef.current = newAgent;
    setIsReady(true);

    newAgent.startTickLoop((action) => {
      console.log('[Agent] Proactive action:', action);
    });

    return () => { newAgent.stopTickLoop(); };
  }, [userId]);

  useEffect(() => {
    if (agentRef.current && products.length > 0) {
      agentRef.current.setProducts(products);
    }
  }, [products]);

  useEffect(() => {
    if (!agent) return;
    const updateStats = () => {
      const s = agent.getStats();
      setStats({ messageCount: s.messageCount, tokenCount: s.tokenCount, shoppingEvents: s.shoppingEvents });
    };
    updateStats();
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, [agent]);

  const sendMessage = useCallback(async (message: string) => {
    if (!agentRef.current) return;
    await agentRef.current.addUserMessage(message);
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    if (!agentRef.current) return null;
    const result = await agentRef.current.search(query);
    return result.success ? result.data : null;
  }, []);

  const getRecommendations = useCallback(async (options?: any) => {
    if (!agentRef.current) return null;
    const result = await agentRef.current.getRecommendations(options);
    return result.success ? result.data : null;
  }, []);

  const getProductDetail = useCallback(async (productId: string) => {
    if (!agentRef.current) return null;
    const result = await agentRef.current.getProductWithReasoning(productId);
    return result.success ? result.data : null;
  }, []);

  const trackCartAdd = useCallback(async (productId: string) => {
    if (!agentRef.current) return;
    await agentRef.current.addToCart(productId);
  }, []);

  const updatePreferencesFn = useCallback(async (prefs: Partial<UserPreferenceProfile>) => {
    if (!agentRef.current) return;
    await agentRef.current.learnPreferences(prefs);
  }, []);

  const contextValue: AgentContextValue = {
    agent, isReady,
    sessionId: agent?.getSessionId() || null,
    stats,
    sendMessage, searchProducts, getRecommendations,
    getProductDetail, trackCartAdd, updatePreferences: updatePreferencesFn,
  };

  return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgent must be used within an AgentProvider');
  return context;
}

export default AgentContext;
