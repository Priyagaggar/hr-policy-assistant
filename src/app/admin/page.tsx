"use client";

import React, { useState, useEffect } from 'react';
import UploadPanel from '@/components/UploadPanel';
import DocumentList from '@/components/DocumentList';
import { UploadedDocument } from '@/types';
import Link from 'next/link';

export default function AdminPage() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load documents from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('indexed_documents');
    if (stored) {
      try {
        setDocuments(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse indexed_documents from localStorage:', e);
      }
    }
  }, []);

  // Sync Theme State
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

  const handleUploadSuccess = (newDoc: UploadedDocument) => {
    setDocuments((prev) => {
      const filtered = prev.filter(d => d.filename !== newDoc.filename);
      const updated = [newDoc, ...filtered];
      localStorage.setItem('indexed_documents', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}" and remove its indexed vectors from the knowledge base?`)) {
      return;
    }

    setDeletingFilename(filename);

    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete document.');
      }

      setDocuments((prev) => {
        const updated = prev.filter(d => d.filename !== filename);
        localStorage.setItem('indexed_documents', JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      alert(err.message || 'An error occurred during deletion.');
    } finally {
      setDeletingFilename(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 transition-colors duration-300 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">Adani</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block -mt-1 font-medium">HR Suite</span>
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
            href="/" 
            className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Go to Employee Chat</span>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-[640px] mx-auto py-10 px-6 md:px-8 space-y-10">
        {/* Header Block */}
        <div className="text-left space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">HR Policy Admin Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Upload company policy documents (PDF or DOCX) to update the chatbot's knowledge base.</p>
        </div>

        {/* Upload and Documents section */}
        <div className="grid grid-cols-1 gap-8">
          <UploadPanel onUploadSuccess={handleUploadSuccess} />
          <DocumentList 
            documents={documents} 
            onDelete={handleDelete}
            deletingFilename={deletingFilename}
          />
        </div>
      </main>
    </div>
  );
}
