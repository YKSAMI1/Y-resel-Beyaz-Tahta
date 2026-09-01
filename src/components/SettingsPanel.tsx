"use client";

import React from 'react';
import { WhiteboardSettings } from '@/types';

interface SettingsPanelProps {
  settings: WhiteboardSettings;
  onUpdate: (settings: Partial<WhiteboardSettings>) => void;
  onClose: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function SettingsPanel({ settings, onUpdate, onClose, onDelete, onClear }: SettingsPanelProps) {
  const backgrounds = [
    { id: 'white', label: 'Beyaz', color: '#ffffff' },
    { id: 'black', label: 'Siyah', color: '#1a1a1a' },
    { id: 'gray', label: 'Gri', color: '#f3f4f6' },
    { id: 'dots', label: 'Noktalı', color: '#f8f9fa' },
    { id: 'grid', label: 'Kareli', color: '#f0f0f0' },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">⚙️ Tahta Ayarları</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🎨 Arka Plan</label>
            <div className="grid grid-cols-5 gap-2">
              {backgrounds.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => onUpdate({ background: bg.id as WhiteboardSettings['background'] })}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    settings.background === bg.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: bg.color }}
                  title={bg.label}
                >
                  {bg.id === 'dots' && <span className="text-xs">⋮⋮</span>}
                  {bg.id === 'grid' && <span className="text-xs">⊞</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Grid toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">📐 Izgarayı Göster</span>
            <button
              onClick={() => onUpdate({ showGrid: !settings.showGrid })}
              className={`w-11 h-6 rounded-full transition-colors ${settings.showGrid ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mx-0.5 ${settings.showGrid ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Cursors toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">🖱️ İmleçleri Göster</span>
            <button
              onClick={() => onUpdate({ showCursors: !settings.showCursors })}
              className={`w-11 h-6 rounded-full transition-colors ${settings.showCursors ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mx-0.5 ${settings.showCursors ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Danger zone */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <button
              onClick={onClear}
              className="w-full py-2.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 text-sm font-medium transition-colors"
            >
              🧹 Tahtayı Temizle
            </button>
            <button
              onClick={onDelete}
              className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
            >
              🗑️ Tahtayı Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
