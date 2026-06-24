"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadedDocument } from '../types';

interface UploadPanelProps {
  onUploadSuccess: (doc: UploadedDocument) => void;
}

export default function UploadPanel({ onUploadSuccess }: UploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (selectedFiles: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const f of selectedFiles) {
      const nameLower = f.name.toLowerCase();
      const isValidType = nameLower.endsWith('.pdf') || nameLower.endsWith('.docx');
      if (isValidType) {
        if (!files.some(existing => existing.name === f.name)) {
          validFiles.push(f);
        }
      } else {
        invalidFiles.push(f.name);
      }
    }

    if (invalidFiles.length > 0) {
      setStatus('error');
      setMessage(`Unsupported file type(s): ${invalidFiles.join(', ')}. Only PDF and DOCX files are allowed.`);
    } else {
      setStatus('idle');
      setMessage('');
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setStatus('idle');
    setMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAllFiles = () => {
    setFiles([]);
    setStatus('idle');
    setMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setStatus('idle');
    setMessage('');
    setUploadProgress({ current: 0, total: files.length, currentFileName: '' });

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length, currentFileName: file.name });

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        successCount++;
        onUploadSuccess({
          filename: data.filename || file.name,
          chunkCount: data.chunkCount || 0,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(err);
        errors.push(`${file.name}: ${err.message || 'Unknown error'}`);
      }
    }

    setUploadProgress(null);
    setUploading(false);

    if (errors.length === 0) {
      setStatus('success');
      setMessage(`Successfully uploaded and indexed all ${successCount} document(s)!`);
      setFiles([]);
    } else if (successCount > 0) {
      setStatus('warning');
      setMessage(`Uploaded ${successCount} document(s) successfully. Failed to upload ${errors.length} document(s):\n${errors.join('\n')}`);
      setFiles(prev => prev.filter(f => errors.some(errStr => errStr.startsWith(f.name))));
    } else {
      setStatus('error');
      setMessage(`Failed to upload files:\n${errors.join('\n')}`);
    }
  };

  const getFileIcon = (fileName: string) => {
    const isDocx = fileName.toLowerCase().endsWith('.docx');
    if (isDocx) {
      return (
        <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    }
    return (
      <div className="p-2 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 max-w-xl mx-auto w-full transition-all duration-300 hover:shadow-md">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Upload Documents</h3>
      
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/30"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className={`p-3 rounded-full bg-slate-100 dark:bg-slate-700 transition-colors duration-200 ${dragActive ? 'bg-blue-100 dark:bg-blue-800/40' : ''}`}>
            <svg className={`w-8 h-8 ${dragActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Drag and drop your files here, or <span className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF and DOCX documents up to 10MB each. Select multiple files at once.</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{files.length} file(s) selected</span>
            <button 
              onClick={(e) => { e.stopPropagation(); clearAllFiles(); }}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {files.map((f, idx) => (
              <div key={`${f.name}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex items-center space-x-3 truncate">
                  {getFileIcon(f.name)}
                  <div className="text-left truncate">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col space-y-3">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all duration-200 cursor-pointer"
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Uploading {uploadProgress?.current}/{uploadProgress?.total}...</span>
              </div>
              {uploadProgress?.currentFileName && (
                <span className="text-xs text-blue-200 mt-1 truncate max-w-xs block font-normal">
                  Processing: {uploadProgress.currentFileName}
                </span>
              )}
            </div>
          ) : (
            `Upload ${files.length > 0 ? files.length : ''} Document(s)`
          )}
        </button>

        {status !== 'idle' && (
          <div
            className={`p-3 rounded-lg text-sm flex items-start space-x-2 whitespace-pre-line ${
              status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50' : 
              status === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50' : 
              'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50'
            }`}
          >
            {status === 'success' ? (
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : status === 'warning' ? (
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
