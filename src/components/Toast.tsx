"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;

export function showToast(message: string, type: Toast['type'] = 'info') {
  const event = new CustomEvent('show-toast', {
    detail: { id: String(++toastId), message, type },
  });
  window.dispatchEvent(event);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as Toast;
    setToasts(prev => [...prev, detail]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== detail.id));
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener('show-toast', addToast);
    return () => window.removeEventListener('show-toast', addToast);
  }, [addToast]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium whitespace-nowrap pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '❌ '}
          {toast.type === 'info' && 'ℹ️ '}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
