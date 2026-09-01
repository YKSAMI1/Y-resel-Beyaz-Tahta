"use client";

import React, { useState } from 'react';
import { Tool } from '@/types';
import { BASIC_COLORS, EXTRA_COLORS, BRUSH_STYLES, BRUSH_SIZES, SHAPE_OPTIONS } from './colorData';

type TabId = 'basic' | 'extra' | 'custom' | 'style' | 'size' | 'shape';

interface TopToolbarProps {
  activeTool: Tool;
  color: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  onColorChange: (color: string) => void;
  onFillColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onToolSelect: (tool: Tool) => void;
  onStyleChange: (style: string) => void;
  activeStyle: string;
}

export default function TopToolbar({
  activeTool,
  color,
  fillColor,
  strokeWidth,
  opacity,
  onColorChange,
  onFillColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  onToolSelect,
  onStyleChange,
  activeStyle,
}: TopToolbarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [customColors, setCustomColors] = useState<(string | null)[]>(Array(35).fill(null));
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'stroke' | 'fill'>('stroke');
  const [tempColor, setTempColor] = useState('#000000');

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'basic', label: 'Temel', icon: '🎨' },
    { id: 'extra', label: 'Ekstra', icon: '🎨' },
    { id: 'custom', label: 'Özel', icon: '🎨' },
    { id: 'style', label: 'Stil', icon: '✏️' },
    { id: 'size', label: 'Boyut', icon: '⚫' },
    { id: 'shape', label: 'Şekil', icon: '〰️' },
  ];

  const handleCustomColorSelect = (index: number) => {
    setPickerTarget('stroke');
    setTempColor(color);
    setShowColorPicker(true);
  };

  const saveCustomColor = () => {
    const idx = customColors.findIndex(c => c === null);
    if (idx !== -1) {
      const newColors = [...customColors];
      newColors[idx] = tempColor;
      setCustomColors(newColors);
    }
    onColorChange(tempColor);
    setShowColorPicker(false);
  };

  return (
    <div className="bg-[#f0f0f0] border-b border-[#d0d0d0]">
      {/* Tab bar — yatay kaydırılabilir */}
      <div className="flex border-b border-[#d0d0d0] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-[#d0d0d0] transition-all whitespace-nowrap shrink-0
              ${activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-inner border-b-2 border-b-[#4a90d9]'
                : 'bg-[#e8e8e8] text-gray-600 hover:bg-[#e0e0e0]'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — mobilde kaydırılabilir, max-height viewport'a göre */}
      <div className="min-h-[80px] max-h-[40vh] sm:max-h-[200px] overflow-y-auto bg-white">
        {activeTab === 'basic' && (
          <BasicColorTab
            colors={BASIC_COLORS}
            activeColor={color}
            onColorSelect={onColorChange}
            fillColor={fillColor}
            onFillColorSelect={onFillColorChange}
          />
        )}
        {activeTab === 'extra' && (
          <ExtraColorTab
            colors={EXTRA_COLORS}
            activeColor={color}
            onColorSelect={onColorChange}
          />
        )}
        {activeTab === 'custom' && (
          <CustomColorTab
            customColors={customColors}
            onColorSelect={onColorChange}
            onAddColor={() => handleCustomColorSelect(0)}
            activeColor={color}
          />
        )}
        {activeTab === 'style' && (
          <StyleTab
            activeStyle={activeStyle}
            onStyleSelect={onStyleChange}
          />
        )}
        {activeTab === 'size' && (
          <SizeTab
            activeSize={strokeWidth}
            onSizeSelect={onStrokeWidthChange}
          />
        )}
        {activeTab === 'shape' && (
          <ShapeTab
            activeTool={activeTool}
            onShapeSelect={onToolSelect}
          />
        )}
      </div>

      {/* Opacity bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[#d0d0d0] bg-[#f8f8f8]">
        <span className="text-[10px] text-gray-500 font-medium">Opaklık</span>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(opacity * 100)}
          onChange={e => onOpacityChange(Number(e.target.value) / 100)}
          className="flex-1 h-1 accent-[#4a90d9]"
        />
        <span className="text-[10px] text-gray-600 font-mono w-8 text-right">%{Math.round(opacity * 100)}</span>
      </div>

      {/* Color picker modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowColorPicker(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">🎨 Renk Seç</h4>
            <input
              type="color"
              value={tempColor}
              onChange={e => setTempColor(e.target.value)}
              className="w-full h-32 rounded-lg cursor-pointer border border-gray-200"
            />
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={tempColor}
                onChange={e => setTempColor(e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg font-mono"
              />
              <button
                onClick={saveCustomColor}
                className="px-3 py-1.5 bg-[#4a90d9] text-white text-xs rounded-lg font-medium"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Basic Color Tab =====
function BasicColorTab({ colors, activeColor, onColorSelect, fillColor, onFillColorSelect }: {
  colors: typeof BASIC_COLORS;
  activeColor: string;
  onColorSelect: (c: string) => void;
  fillColor: string;
  onFillColorSelect: (c: string) => void;
}) {
  const [editTarget, setEditTarget] = useState<'stroke' | 'fill'>('stroke');

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-gray-500 font-medium w-12">Çizgi</span>
        <div className="flex gap-1.5 flex-wrap">
          {colors.map(c => (
            <button
              key={c.hex}
              onClick={() => onColorSelect(c.hex)}
              className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 ${
                activeColor === c.hex ? 'border-[#4a90d9] shadow-md ring-2 ring-[#4a90d9]' : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.tr}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium w-12">Dolgu</span>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onFillColorSelect('transparent')}
            className={`w-9 h-9 rounded-lg border-2 transition-all relative ${
              fillColor === 'transparent' ? 'border-[#4a90d9] shadow-md ring-2 ring-[#4a90d9]' : 'border-gray-200 hover:border-gray-300'
            }`}
            title="Şeffaf"
          >
            <div className="absolute inset-1 bg-white rounded-sm">
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400">✕</div>
            </div>
          </button>
          {colors.map(c => (
            <button
              key={c.hex + '-fill'}
              onClick={() => onFillColorSelect(c.hex)}
              className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 ${
                fillColor === c.hex ? 'border-[#4a90d9] shadow-md ring-2 ring-[#4a90d9]' : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.tr}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Extra Color Tab =====
function ExtraColorTab({ colors, activeColor, onColorSelect }: {
  colors: typeof EXTRA_COLORS;
  activeColor: string;
  onColorSelect: (c: string) => void;
}) {
  return (
    <div className="p-2">
      <div className="grid grid-cols-11 gap-1">
        {colors.map((c, i) => (
          <button
            key={i}
            onClick={() => onColorSelect(c.hex)}
            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
              activeColor === c.hex ? 'border-[#4a90d9] shadow-md ring-2 ring-[#4a90d9]' : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{ backgroundColor: c.hex }}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );
}

// ===== Custom Color Tab =====
function CustomColorTab({ customColors, onColorSelect, onAddColor, activeColor }: {
  customColors: (string | null)[];
  onColorSelect: (c: string) => void;
  onAddColor: () => void;
  activeColor: string;
}) {
  return (
    <div className="p-3">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onAddColor}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400 hover:border-[#4a90d9] hover:text-[#4a90d9] transition-colors"
            title="Renk Ekle"
          >
            +
          </button>
          <span className="text-[10px] text-gray-500">Renk Seç</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {customColors.map((c, i) => (
            <button
              key={i}
              onClick={() => c && onColorSelect(c)}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                c
                  ? `hover:scale-110 ${activeColor === c ? 'border-[#4a90d9] shadow-md' : 'border-gray-200'}`
                  : 'border-dashed border-gray-200 bg-gray-50'
              }`}
              style={c ? { backgroundColor: c } : {}}
              title={c || 'Boş'}
            >
              {!c && <span className="text-[8px] text-gray-300">Boş</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Style Tab =====
function StyleTab({ activeStyle, onStyleSelect }: {
  activeStyle: string;
  onStyleSelect: (style: string) => void;
}) {
  return (
    <div className="p-3">
      <div className="grid grid-cols-5 gap-2">
        {BRUSH_STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => onStyleSelect(s.id)}
            className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all ${
              activeStyle === s.id
                ? 'border-[#4a90d9] bg-[#e8f0fe] shadow-md scale-105'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={s.description}
          >
            <span className="text-2xl">{s.icon}</span>
            <span className="text-[11px] font-semibold text-gray-700">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== Size Tab =====
function SizeTab({ activeSize, onSizeSelect }: {
  activeSize: number;
  onSizeSelect: (size: number) => void;
}) {
  return (
    <div className="p-3">
      <div className="grid grid-cols-5 gap-2">
        {BRUSH_SIZES.map(s => (
          <button
            key={s.id}
            onClick={() => onSizeSelect(s.size)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
              Math.abs(activeSize - s.size) < 0.5
                ? 'border-[#4a90d9] bg-[#e8f0fe] shadow-md scale-105'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={`${s.label} (${s.size}px)`}
          >
            <div
              className="rounded-full bg-[#4a90d9]"
              style={{
                width: Math.min(s.size * 2, 36),
                height: Math.min(s.size * 2, 36),
                opacity: 0.7,
              }}
            />
            <span className="text-[9px] text-gray-500 font-medium">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== Shape Tab =====
function ShapeTab({ activeTool, onShapeSelect }: {
  activeTool: Tool;
  onShapeSelect: (tool: Tool) => void;
}) {
  return (
    <div className="p-3">
      <div className="grid grid-cols-5 gap-2">
        {SHAPE_OPTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onShapeSelect(s.tool as Tool)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              activeTool === s.tool
                ? 'border-[#4a90d9] bg-[#e8f0fe] shadow-md scale-105'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={s.label}
          >
            <span className="text-xl">{s.icon}</span>
            <span className="text-[10px] font-semibold text-gray-700">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
