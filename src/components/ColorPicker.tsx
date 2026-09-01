"use client";

import React, { useState } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const PALETTES = [
  { name: 'Temel', colors: ['#1a1a1a', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'] },
  { name: 'Sıcak', colors: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#b91c1c', '#c2410c', '#a16207', '#854d0e', '#fca5a5'] },
  { name: 'Soğuk', colors: ['#2563eb', '#7c3aed', '#0891b2', '#0d9488', '#1d4ed8', '#6d28d9', '#0e7490', '#0f766e', '#93c5fd'] },
  { name: 'Toprak', colors: ['#78350f', '#92400e', '#451a03', '#713f12', '#3f6212', '#166534', '#134e4a', '#1e3a5f', '#581c87'] },
  { name: 'Pastel', colors: ['#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#e2e8f0', '#f1f5f9'] },
];

export default function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [activePalette, setActivePalette] = useState(0);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1.5 group"
        title={label || 'Renk Seç'}
      >
        <div
          className="w-7 h-7 rounded-lg border-2 border-gray-200 group-hover:border-gray-300 transition-colors shadow-sm"
          style={{ backgroundColor: color === 'transparent' ? '#f3f4f6' : color }}
        >
          {color === 'transparent' && (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">✕</div>
          )}
        </div>
        {label && <span className="text-xs text-gray-500 hidden lg:inline">{label}</span>}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50 w-64 animate-fade-in">
            {/* Quick colors */}
            <div className="grid grid-cols-9 gap-1 mb-3">
              {PALETTES[activePalette].colors.map(c => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setHexInput(c); }}
                  className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-blue-500 shadow-md' : 'border-gray-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Transparent option */}
            <button
              onClick={() => { onChange('transparent'); setHexInput('transparent'); }}
              className={`w-full text-xs py-1.5 rounded-lg border mb-3 transition-colors ${
                color === 'transparent' ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              ✕ Şeffaf (Dolgu Yok)
            </button>

            {/* Palette tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto">
              {PALETTES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePalette(i)}
                  className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-colors ${
                    activePalette === i ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* HEX input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">HEX</span>
              <input
                type="text"
                value={hexInput}
                onChange={e => setHexInput(e.target.value)}
                onBlur={() => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
                    onChange(hexInput);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
                      onChange(hexInput);
                    }
                  }
                }}
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="#000000"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
