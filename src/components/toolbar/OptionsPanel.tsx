"use client";

import React from 'react';
import { WhiteboardSettings, Tool } from '@/types';

interface OptionsPanelProps {
  settings: WhiteboardSettings;
  onUpdateSettings: (s: Partial<WhiteboardSettings>) => void;
  onExportPNG: () => void;
  onClear: () => void;
  onDelete: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  participantCount: number;
  actionCount: number;
  onToolSelect?: (tool: Tool) => void;
  onToggleGrid?: () => void;
  onToggleSettings?: () => void;
  onShare?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export default function OptionsPanel({
  settings,
  onUpdateSettings,
  onExportPNG,
  onClear,
  onDelete,
  onToggleFullscreen,
  isFullscreen,
  participantCount,
  actionCount,
  onToolSelect,
  onToggleGrid,
  onToggleSettings,
  onShare,
  onZoomIn,
  onZoomOut,
}: OptionsPanelProps) {
  const options = [
    { icon: '🧹', label: 'Temizle', onClick: onClear, color: 'text-orange-600 bg-orange-50' },
    { icon: 'Aa', label: 'Metin Ekle', onClick: () => onToolSelect?.('text'), color: 'text-gray-700' },
    { icon: '🔍', label: 'Yakınlaştır', onClick: onZoomIn, color: 'text-gray-700' },
    { icon: '🔗', label: 'Paylaş', onClick: onShare, color: 'text-blue-600 bg-blue-50' },
    { icon: '↔', label: 'Kaydır', onClick: () => onToolSelect?.('hand'), color: 'text-gray-700' },
    { icon: '🖼️', label: 'Görsel Ekle', onClick: () => onToolSelect?.('image'), color: 'text-gray-700' },
    { icon: '🔍', label: 'Uzaklaştır', onClick: onZoomOut, color: 'text-gray-700' },
    { icon: '📋', label: 'Tümünü Kopyala', onClick: () => {}, color: 'text-gray-700', disabled: true },
    { icon: '📷', label: 'Ekran Görüntüsü', onClick: onExportPNG, color: 'text-green-600 bg-green-50' },
    { icon: '⬚', label: 'Seç', onClick: () => onToolSelect?.('select'), color: 'text-gray-700' },
    { icon: '👥', label: `${participantCount} Kişi`, onClick: () => {}, color: 'text-gray-700' },
    { icon: '📑', label: 'Katmanlar', onClick: () => {}, color: 'text-gray-700' },
    { icon: '📐', label: 'Izgara', onClick: onToggleGrid, color: settings.showGrid ? 'text-blue-600 bg-blue-50' : 'text-gray-700' },
    { icon: '⚙️', label: 'Ayarlar', onClick: onToggleSettings, color: 'text-gray-700' },
    { icon: '⛶', label: isFullscreen ? 'Çıkış' : 'Tam Ekran', onClick: onToggleFullscreen, color: 'text-gray-700' },
    { icon: '💾', label: 'PNG İndir', onClick: onExportPNG, color: 'text-gray-700' },
    { icon: '🗑️', label: 'Tahtayı Sil', onClick: onDelete, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="p-2">
      <div className="grid grid-cols-4 gap-1.5">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={opt.onClick}
            disabled={opt.disabled}
            className={`flex flex-col items-center gap-0.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors ${opt.color} ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={opt.label}
          >
            <span className="text-lg">{opt.icon}</span>
            <span className="text-[9px] text-gray-600 font-medium truncate w-full text-center leading-tight">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
