"use client";

import React from 'react';
import { Tool } from '@/types';

interface LeftSidebarProps {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenOptions: () => void;
  undoCount: number;
  redoCount: number;
  onClear?: () => void;
}

const mainTools = [
  { id: 'undo', icon: '↩', label: 'Geri Al', shortcut: 'Ctrl+Z' },
  { id: 'redo', icon: '↪', label: 'Yinele', shortcut: 'Ctrl+Y' },
  { id: 'draw', icon: '✏️', label: 'Çiz', shortcut: 'P', tool: 'pen' as Tool },
  { id: 'erase', icon: '🧹', label: 'Sil', shortcut: 'E', tool: 'eraser' as Tool },
  { id: 'move', icon: '✋', label: 'Hareket et', shortcut: 'H', tool: 'hand' as Tool },
  { id: 'select', icon: '⬚', label: 'Seç', shortcut: 'V', tool: 'select' as Tool },
  { id: 'inspect', icon: '🔍', label: 'İncele', shortcut: 'I', tool: 'inspect' as Tool },
  { id: 'options', icon: '⚙️', label: 'Seçenekler', shortcut: '' },
];

export default function LeftSidebar({
  activeTool,
  onToolSelect,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenOptions,
  undoCount,
  redoCount,
  onClear,
}: LeftSidebarProps) {
  return (
    <div className="w-[68px] bg-[#f0f0f0] border-r border-[#d0d0d0] flex flex-col items-center py-2 gap-1 shrink-0 shadow-inner">
      {mainTools.map((item) => {
        const isActive = item.tool && activeTool === item.tool;
        const isUndo = item.id === 'undo';
        const isRedo = item.id === 'redo';
        const isOptions = item.id === 'options';

        return (
          <button
            key={item.id}
            onClick={() => {
              if (isUndo) onUndo();
              else if (isRedo) onRedo();
              else if (isOptions) onOpenOptions();
              else if (item.tool) onToolSelect(item.tool);
            }}
            disabled={(isUndo && !canUndo) || (isRedo && !canRedo)}
            className={`w-[58px] h-[54px] flex flex-col items-center justify-center rounded-xl transition-all ${isActive ? 'bg-[#4a90d9] text-white shadow-lg scale-105' : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow border border-[#d8d8d8]'} ${(isUndo && !canUndo) || (isRedo && !canRedo) ? 'opacity-40' : ''}`}
            title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}`}
          >
            <span className="text-2xl leading-none">{item.icon}</span>
            <span className="text-[10px] mt-1 font-semibold leading-none">{item.label}</span>
          </button>
        );
      })}

      {/* Clear button at bottom */}
      {onClear && (
        <div className="mt-auto mb-1">
          <button
            onClick={onClear}
            className="w-[58px] h-[54px] flex flex-col items-center justify-center rounded-xl bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 border border-[#d8d8d8] hover:border-red-200 transition-all"
            title="Tahtayı Temizle"
          >
            <span className="text-2xl leading-none">🗑️</span>
            <span className="text-[10px] mt-1 font-semibold leading-none">Temizle</span>
          </button>
        </div>
      )}
    </div>
  );
}
