"use client";

import React, { useState } from 'react';
import { ChatMessage, Source } from '../types';
import SourceCitation from './SourceCitation';

interface MessageBubbleProps {
  message: ChatMessage;
}

function parseTextContent(text: string, sources: Source[], expandReferences: () => void): React.ReactNode[] {
  // Regex to match bold text **bold**, citation tags like [1] or [1, 2, 3], or markdown links [link](url)
  const regex = /(\*\*.*?\*\*|\[\d+(?:,\s*\d+)*\]|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.flatMap((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldVal = part.slice(2, -2);
      return [<strong key={idx} className="font-bold text-slate-900 dark:text-white">{boldVal}</strong>];
    }

    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        return [(
          <a
            key={idx}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center space-x-1"
          >
            <span>{linkText}</span>
            <svg className="w-3 h-3 inline ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )];
      }
    }

    // Match [1] or [1, 2, 3] citation formats
    const multiCitationMatch = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
    if (multiCitationMatch) {
      const nums = multiCitationMatch[1].split(',').map(n => parseInt(n.trim(), 10));
      return nums.map((indexNum, i) => {
        const source = sources.find(s => s.index === indexNum);
        if (source) {
          return (
            <button
              key={`${idx}-${i}`}
              type="button"
              className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full w-4.5 h-4.5 text-[9px] font-extrabold mx-0.5 align-super cursor-pointer transition-all active:scale-95 shadow-sm shadow-blue-100/50"
              title={`${source.filename} (Page ${source.pageNumber})`}
              onClick={() => {
                expandReferences();
                setTimeout(() => {
                  const el = document.getElementById(`source-ref-${indexNum}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/50');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50');
                    }, 2000);
                  }
                }, 150);
              }}
            >
              {indexNum}
            </button>
          );
        }
        return null;
      }).filter(Boolean) as React.ReactNode[];
    }

    return [part];
  });
}


function formatMessageContent(content: string, sources: Source[], expandReferences: () => void) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const bulletMatch = line.match(/^(\s*)([*\-•])\s+(.*)$/);
    
    if (bulletMatch) {
      const textContent = bulletMatch[3];
      currentList.push(
        <li key={`li-${index}`} className="ml-4 list-disc text-sm text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
          {parseTextContent(textContent, sources, expandReferences)}
        </li>
      );
    } else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${index}`} className="my-2 space-y-1">
            {currentList}
          </ul>
        );
        currentList = [];
      }
      
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={`h-${index}`} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">
            {parseTextContent(trimmed.slice(4), sources, expandReferences)}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={`h-${index}`} className="text-base font-extrabold text-slate-900 dark:text-white mt-5 mb-2.5">
            {parseTextContent(trimmed.slice(3), sources, expandReferences)}
          </h3>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={`h-${index}`} className="text-lg font-extrabold text-slate-900 dark:text-white mt-6 mb-3">
            {parseTextContent(trimmed.slice(2), sources, expandReferences)}
          </h2>
        );
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={`p-${index}`} className="text-sm text-slate-800 dark:text-slate-300 my-1.5 leading-relaxed">
            {parseTextContent(line, sources, expandReferences)}
          </p>
        );
      } else {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      }
    }
  });
  
  if (currentList.length > 0) {
    elements.push(
      <ul key="ul-final" className="my-2 space-y-1">
        {currentList}
      </ul>
    );
  }
  
  return elements;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isLoading = !isUser && !message.content;
  const sourcesList = message.sources || [];
  const [isReferencesExpanded, setIsReferencesExpanded] = useState(false);

  const expandReferences = () => {
    setIsReferencesExpanded(true);
  };

  return (
    <div className={`flex w-full mb-4`}>
      <div 
        className={
          isUser
            ? 'bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-sm max-w-xs ml-auto shadow-sm shadow-blue-500/20'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-5 py-4 rounded-2xl rounded-bl-sm max-w-lg shadow-sm hover:shadow-md transition-shadow duration-300'
        }
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : isLoading ? (
          /* Bouncing dots typing indicator */
          <div className="flex items-center space-x-1.5 py-1.5 px-1">
            <div className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-slate-800 dark:text-slate-100">{formatMessageContent(message.content, sourcesList, expandReferences)}</div>
            {sourcesList.length > 0 && (
              <SourceCitation 
                sources={sourcesList} 
                isExpanded={isReferencesExpanded}
                onToggle={() => setIsReferencesExpanded(!isReferencesExpanded)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
