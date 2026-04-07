'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Bot, User, Sparkles, Loader2, Search, TrendingUp, ShoppingBag } from 'lucide-react';
import { createAgent, MirragoAgent, Product } from '@/lib/agent';

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
  userId?: string;
  onProductClick?: (productId: string) => void;
}

export default function AIAssistant({ products, userId, onProductClick }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agent, setAgent] = useState<MirragoAgent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tickLoopActive, setTickLoopActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newAgent = createAgent(userId || null);
    newAgent.setProducts(products);
    setAgent(newAgent);

    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Namaste! I'm Mirrago AI, your personal fashion assistant.\n\n\u2022 Search by style, occasion, or budget\n\u2022 Find complementary outfit items\n\u2022 Get personalized recommendations\n\u2022 Discover deals within your budget\n\nWhat are you looking for today?`,
      timestamp: Date.now(),
    }]);
  }, [userId]);

  useEffect(() => {
    if (agent) agent.setProducts(products);
  }, [agent, products]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const toggleTickLoop = useCallback(() => {
    if (!agent) return;
    if (tickLoopActive) {
      agent.stopTickLoop();
      setTickLoopActive(false);
    } else {
      agent.startTickLoop(() => {});
      setTickLoopActive(true);
    }
  }, [agent, tickLoopActive]);

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
      await agent.addUserMessage(query);
      const result = await agent.search(query);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      if (result.success && result.data) {
        const data = result.data;
        const totalCount = data.totalCount || 0;
        const intent = data.intent || 'general';

        if (totalCount > 0) {
          assistantMessage.content = `I found **${totalCount} products** matching your search (intent: ${intent}).`;

          if (data.uiHints?.length > 0) {
            assistantMessage.searchResults = {
              count: totalCount,
              intent,
              suggestions: data.suggestions?.map((s: { type: string; query: string; reason: string }) => ({
                type: s.type,
                query: s.query,
                reason: s.reason,
              })) || [],
              uiHints: data.uiHints,
            };
          }

          if (data.products?.length > 0) {
            assistantMessage.recommendations = data.products.slice(0, 5).map((p: { productId: string | number; matchReasons?: string[] }) => {
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
  }, [input, agent, isProcessing, products]);

  const handleSuggestionClick = useCallback((query: string) => {
    setInput(query);
    inputRef.current?.focus();
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-nepal-red hover:bg-nepal-crimson text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
        aria-label="Open AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-nepal-red" size={20} />
              <h3 className="font-semibold text-gray-900 dark:text-white">Mirrago AI Assistant</h3>
            </div>
            <button
              onClick={toggleTickLoop}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
            >
              {tickLoopActive && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              {tickLoopActive ? 'Proactive ON' : 'Proactive OFF'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-nepal-red text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}>
                  <div className="flex items-start gap-2">
                    {msg.role === 'assistant' && <Bot size={16} className="mt-1 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {msg.searchResults?.uiHints && msg.searchResults.uiHints.length > 0 && (
                        <div className="mt-2 text-xs text-nepal-red dark:text-nepal-red italic">
                          {msg.searchResults.uiHints[0]}
                        </div>
                      )}

                      {msg.searchResults?.suggestions && msg.searchResults.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.searchResults.suggestions.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(s.query)}
                              className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                              title={s.reason}
                            >
                              {s.type === 'refine' && <Search size={10} className="inline mr-1" />}
                              {s.type === 'expand' && <TrendingUp size={10} className="inline mr-1" />}
                              {s.type === 'complement' && <ShoppingBag size={10} className="inline mr-1" />}
                              {s.query}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.recommendations.map((rec, idx) => (
                            <button
                              key={idx}
                              onClick={() => onProductClick?.(String(rec.id))}
                              className="w-full text-left text-xs p-2 rounded bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                              <div className="font-medium">{rec.name}</div>
                              <div className="text-nepal-red">\u20A8{rec.price.toLocaleString()}</div>
                              <div className="text-gray-500 dark:text-gray-400 truncate">{rec.reason}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && <User size={16} className="mt-1 flex-shrink-0" />}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything about fashion..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-nepal-red"
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={isProcessing || !input.trim()}
              className="px-3 py-2 bg-nepal-red hover:bg-nepal-crimson text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
