"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import MessageBubble from '@/components/MessageBubble';
import Link from 'next/link';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle Theme Toggling
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: query };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer.');
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: err.message || 'Sorry, I encountered an error while processing your request.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 tracking-tight leading-none">HR Assistant</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ask questions about company policies</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
          </button>

          <Link 
            href="/admin" 
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1.5 transition-colors"
          >
            <span>Admin Portal</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
        {messages.length === 0 ? (
          /* Welcome Card */
          <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 text-center space-y-4 animate-fade-in transition-colors duration-300">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-full w-fit mx-auto text-blue-500 dark:text-blue-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Welcome to HR Policy Hub</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Hi! I'm your HR Policy Assistant. Ask me anything about company policies — leave, attendance, travel reimbursement, medical benefits, or onboarding.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 justify-center">
              <button 
                onClick={() => setInput("What is the leave policy?")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 px-3 py-1.5 rounded-full transition-colors border border-blue-100 dark:border-blue-800/50"
              >
                Leave Policy
              </button>
              <button 
                onClick={() => setInput("How to request travel reimbursement?")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 px-3 py-1.5 rounded-full transition-colors border border-blue-100 dark:border-blue-800/50"
              >
                Travel Reimbursement
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-[768px] mx-auto w-full">
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}
            {loading && (
              <MessageBubble message={{ role: 'assistant', content: '' }} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4 px-6 md:px-12 sticky bottom-0 z-40 transition-colors duration-300">
        <form onSubmit={handleSend} className="max-w-[768px] mx-auto flex items-center space-x-3 w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about leave, attendance, travel policy..."
            disabled={loading}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors cursor-pointer shadow-sm shadow-blue-500/30"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
