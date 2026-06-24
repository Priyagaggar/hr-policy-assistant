"use client";

import React from 'react';
import { UploadedDocument } from '../types';

interface DocumentListProps {
  documents: UploadedDocument[];
  onDelete: (filename: string) => void;
  deletingFilename?: string | null;
}

export default function DocumentList({ documents, onDelete, deletingFilename }: DocumentListProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getFileIcon = (filename: string) => {
    const isDocx = filename.toLowerCase().endsWith('.docx');
    if (isDocx) {
      return (
        <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 group-hover:bg-blue-100/70 dark:group-hover:bg-blue-850/50 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    }
    return (
      <div className="p-2 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 group-hover:bg-rose-100/70 dark:group-hover:bg-rose-850/50 transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 w-full transition-all duration-300 hover:shadow-md">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Indexed Documents</h3>
      
      {documents.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No documents uploaded yet</p>
          <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Upload policy documents above to index them for chatbot search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Document Name</th>
                <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Sections</th>
                <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Upload Date</th>
                <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {documents.map((doc, idx) => {
                const isDeleting = deletingFilename === doc.filename;
                return (
                  <tr key={`${doc.filename}-${idx}`} className="group hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(doc.filename)}
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate max-w-xs md:max-w-md block" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {doc.chunkCount} sections
                    </td>
                    <td className="py-4 text-sm text-slate-400 dark:text-slate-500">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                          Indexed
                        </span>
                        <button
                          onClick={() => onDelete(doc.filename)}
                          disabled={isDeleting || !!deletingFilename}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                          title="Delete document"
                        >
                          {isDeleting ? (
                            <svg className="w-4 h-4 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
