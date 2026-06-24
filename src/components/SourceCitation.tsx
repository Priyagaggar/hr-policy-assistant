"use client";

import React from 'react';
import { Source } from '../types';

interface SourceCitationProps {
  sources: Source[];
  isExpanded: boolean;
  onToggle: () => void;
}

export default function SourceCitation({ sources, isExpanded, onToggle }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all duration-200">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-2.5 text-left text-xs font-medium hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2 truncate">
            <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-slate-700 dark:text-slate-200 font-semibold">Sources & References</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">{sources.length} reference(s)</span>
          </div>
          <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0 text-[11px]">
            <span>{isExpanded ? 'Hide references' : 'Show references'}</span>
            <svg 
              className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isExpanded && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2.5 max-h-80 overflow-y-auto">
            {sources.map((src) => (
              <div 
                key={src.index} 
                id={`source-ref-${src.index}`}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 transition-all duration-300"
              >
                <div className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-full w-4 h-4 text-[9px] font-bold flex-shrink-0">
                      {src.index}
                    </span>
                    <span className="truncate text-slate-700 dark:text-slate-200 font-semibold" title={src.filename}>
                      {src.filename}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal">Page {src.pageNumber}</span>
                  </div>
                </div>
                <div className="relative pl-3 border-l-2 border-blue-500/50 italic text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                  "{src.excerpt}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
