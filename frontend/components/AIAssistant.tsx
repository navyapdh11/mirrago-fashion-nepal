'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, ShoppingBag, TrendingUp, Search } from 'lucide-react';
import { useAgent } from '@/context/AgentContext';
import type { Product, SearchSuggestion } from '@/lib/agent/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  searchResults?: {
    count: number;
    intent: string;
    suggestions: Array<{ type: string; query: string; reason: string }>;
    uiHints?: string[];
  };
  recommendations?: Array<{
    id: string | number;
    name: string;
    price: number;
    reason: string;
  }>;
}

interface AIAssistantProps {
  products: Product[];
  onProductClick?: (productId: string) => void;
}

export default function AIAssistant({ products, onProductClick }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the AgentContext instead of creating a duplicate agent
  const { agent, isReady, sendMessage, searchProducts: searchProductsFn, getRecommendations } = useAgent();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Namaste! I'm Mirrago AI, your personal fashion assistant.\n\n\u2022 Search by style, occasion, or budget\n\u2022 Find complementary outfit items\n\u2022 Get personalized recommendations\n\u2022 Discover deals within your budget\n\nWhat are you looking for today?`,
        timestamp: Date.now(),
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !agent || isProcessing) return;

    const query = input.trim();
    setInput('');
    setIsProcessing(true);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      await sendMessage(query);
      const result = await searchProductsFn(query);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      if (result) {
        const totalCount = result.totalCount || 0;
        const intent = result.intent || 'general';

        if (totalCount > 0) {
          assistantMessage.content = `I found **${totalCount} products** matching your search (intent: ${intent}).`;

          if (result.uiHints?.length) {
            assistantMessage.searchResults = {
              count: totalCount,
              intent,
              suggestions: result.suggestions?.map((s: SearchSuggestion) => ({ type: s.type, query: s.query, reason: s.reason })) || [],
              uiHints: result.uiHints,
            };
          }

          if (result.products?.length > 0) {
            assistantMessage.recommendations = result.products.slice(0, 5).map((p: any) => {
              const prod = products.find(pr => String(pr.id) === String(p.productId));
              return {
                id: p.productId,
                name: prod?.name || 'Unknown',
                price: prod?.price || 0,
                reason: p.matchReasons?.join(', ') || 'Matches your search',
              };
            });
          }
        } else {
          assistantMessage.content = "I couldn't find exact matches. Try browsing our **Products** page or use specific terms like 'casual dress under 2000'.";
        }
      } else {
        assistantMessage.content = "I couldn't process that request. Try asking about specific products, styles, or occasions!";
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again!',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, agent, isProcessing, products, sendMessage, searchProductsFn]);

  const handleQuickAction = useCallback(async (query: string) => {
    if (!agent || isProcessing) return;
    setInput(query);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setInput('');

    try {
      await sendMessage(query);
      const result = await searchProductsFn(query);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      if (result && result.totalCount > 0) {
        assistantMessage.content = `Found **${result.totalCount} products** for you!`;
        assistantMessage.recommendations = result.products.slice(0, 5).map((p: any) => {
          const prod = products.find(pr => String(pr.id) === String(p.productId));
          return {
            id: p.productId,
            name: prod?.name || 'Unknown',
            price: prod?.price || 0,
            reason: p.matchReasons?.join(', ') || 'Recommended for you',
          };
        });
      } else {
        // Fallback to general recommendations
        const recs = await getRecommendations({ count: 5 });
        if (recs?.products?.length) {
          assistantMessage.content = `Here are some recommendations based on your style!`;
          assistantMessage.recommendations = recs.products.slice(0, 5).map((p: Product) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            reason: `Matches your preferences`,
          }));
        } else {
          assistantMessage.content = "Browse our **Products** page to discover great items!";
        }
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Try again!',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [agent, isProcessing, products, sendMessage, searchProductsFn, getRecommendations]);

  const handleProductClick = (productId: string) => {
    if (onProductClick) {
      onProductClick(productId);
    }
  };

  if (!isReady) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-nepal-red hover:bg-nepal-crimson text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '600px', maxHeight: 'calc(100vh - 150px)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-nepal-red to-nepal-crimson text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <div>
                <h3 className="font-semibold">Mirrago AI Assistant</h3>
                <p className="text-xs text-white/80">Powered by KAIROS-MIRRAGO</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-nepal-red text-white rounded-br-md' : 'bg-white border border-gray-200 rounded-bl-md'}`}>
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>

                  {/* Product Cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.recommendations.map((rec, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleProductClick(String(rec.id))}
                          className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-left"
                        >
                          <ShoppingBag size={16} className="text-nepal-red" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{rec.name}</p>
                            <p className="text-xs text-gray-600">रू{rec.price.toLocaleString()}</p>
                            {rec.reason && <p className="text-xs text-gray-400 truncate">{rec.reason}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* UI Hints */}
                  {msg.searchResults?.uiHints && msg.searchResults.uiHints.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      {msg.searchResults.uiHints.map((hint: string, i: number) => (
                        <p key={i}>{hint}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 bg-white border-t border-gray-200 flex gap-2 overflow-x-auto">
            <button onClick={() => handleQuickAction('Show me trending items')} className="flex-shrink-0 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition">🔥 Trending</button>
            <button onClick={() => handleQuickAction('Show items under रू2000')} className="flex-shrink-0 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition">💰 Under रू2000</button>
            <button onClick={() => handleQuickAction('I need outfit for wedding')} className="flex-shrink-0 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition">👔 Wedding outfit</button>
            <button onClick={() => handleQuickAction('Show casual wear')} className="flex-shrink-0 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition">👕 Casual wear</button>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-nepal-red focus:border-transparent text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="bg-nepal-red hover:bg-nepal-crimson disabled:bg-gray-300 text-white rounded-full p-2 transition"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
