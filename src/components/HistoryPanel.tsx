"use client";

import React from 'react';
import { DrawAction } from '@/types';

interface HistoryPanelProps {
  history: DrawAction[];
  onClose: () => void;
}

export default function HistoryPanel({ history, onClose }: HistoryPanelProps) {
  const typeLabels: Record<string, string> = {
    pen: '✏️ Kalem ile çizdi',
    freehand: '✏️ Serbest çizim yaptı',
    eraser: '🧹 Sildi',
    line: '╱ Çizgi çizdi',
    arrow: '→ Ok çizdi',
    rectangle: '▭ Dikdörtgen çizdi',
    square: '□ Kare çizdi',
    circle: '○ Daire çizdi',
    ellipse: '⬭ Elips çizdi',
    triangle: '△ Üçgen çizdi',
    star: '☆ Yıldız çizdi',
    text: '📝 Metin ekledi',
    image: '🖼️ Görsel ekledi',
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">📋 İşlem Geçmişi</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-xs">
            Henüz işlem yapılmadı
          </div>
        ) : (
          [...history].reverse().map((action, idx) => (
            <div
              key={action.id}
              className="px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <p className="text-xs text-gray-700">
                {typeLabels[action.type] || action.type}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatTime(action.timestamp)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
