import React, { useEffect, useState } from 'react';
import { BookOpen, Send } from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { AiChatMessage, KnowledgeDocument, User } from '../types';

const SUGGESTED_PROMPTS = [
  'How do I book the clubhouse and what are the quiet hours?',
  'What is the late fee policy for maintenance bills?',
  'How does visitor pre-approval and walk-in entry work?',
  'What are the complaint SLA timelines by priority?',
];

export function AiAssistantView({ user }: { user: User }) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<KnowledgeDocument[]>('/ai/knowledge').then(setDocs).catch(() => {});
  }, [user.id]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError('');
    setInput('');
    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      provider: 'gemini',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await apiRequest<{
        answer: string;
        sources: { id: string; title: string; category: string }[];
        provider: 'gemini' | 'fallback';
        disclaimer: string;
      }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed }),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
          provider: res.provider,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assistant request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col h-[600px]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">SocietySync AI Assistant</h2>
            <p className="text-xs text-slate-500">Grounded on admin-approved Green Valley Residency policies</p>
          </div>
          <span className="text-xs text-slate-500">Advisory only · Verify before acting</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="py-8 space-y-4">
              <p className="text-sm text-slate-600">
                Ask about society bylaws, maintenance billing, amenity booking rules, visitor protocols, or complaint SLAs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="text-left p-3 text-xs text-slate-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <div>{m.content}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
                      Sources: {m.sources.map((s) => s.title).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && <div className="text-xs text-slate-500">Checking approved society documents...</div>}
          {error && <div className="text-xs text-rose-700">{error}</div>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about society policies..."
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" /> Ask
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpen className="w-4 h-4 text-indigo-700" />
          <span>Approved Knowledge Base</span>
        </div>
        <div className="divide-y divide-slate-100">
          {docs.map((d) => (
            <div key={d.id} className="py-3">
              <div className="text-xs text-indigo-700 font-medium">{d.category}</div>
              <div className="text-sm font-medium text-slate-900 mt-0.5">{d.title}</div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-3">{d.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
