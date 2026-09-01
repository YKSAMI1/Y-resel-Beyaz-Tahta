"use client";

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareModalProps {
  boardId: string;
  onClose: () => void;
}

export default function ShareModal({ boardId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/tahta/${boardId}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">🔗 Paylaş</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <QRCodeSVG value={url} size={160} level="M" />
            </div>
          </div>

          {/* Link */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Tahta Bağlantısı</p>
            <p className="text-sm text-gray-700 font-mono break-all">{url}</p>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {copied ? '✅ Bağlantı Kopyalandı!' : '📋 Bağlantıyı Kopyala'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Bu bağlantıyı paylaşarak başkalarını tahtaya davet edebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
