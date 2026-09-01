"use client";

import React, { useState, useEffect } from 'react';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  useEffect(() => {
    const handleOnline = () => setStatus('connected');
    const handleOffline = () => setStatus('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (status === 'connected') return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 ${
        status === 'disconnected'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      {status === 'disconnected' ? (
        <>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          ⚠️ Bağlantı kesildi. Yeniden bağlanılıyor...
        </>
      ) : (
        <>
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          🔄 Yeniden bağlanılıyor...
        </>
      )}
    </div>
  );
}
