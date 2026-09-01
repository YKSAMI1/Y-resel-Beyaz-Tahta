"use client";

import React, { useState } from 'react';
import { Layer } from '@/types';
import { generateId } from '@/lib/utils';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Layer>) => void;
  onAdd: (layer: Layer) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function LayersPanel({
  layers,
  activeLayerId,
  onSelect,
  onUpdate,
  onAdd,
  onDelete,
  onReorder,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const newLayer: Layer = {
      id: generateId(),
      name: `Katman ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      order: layers.length,
    };
    onAdd(newLayer);
  };

  const startRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const finishRename = (id: string) => {
    if (editName.trim()) {
      onUpdate(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">📑 Katmanlar</h3>
          <button
            onClick={handleAdd}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
          >
            + Yeni
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer, idx) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 cursor-pointer transition-colors ${
              activeLayerId === layer.id ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(layer.id)}
          >
            {/* Visibility toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(layer.id, { visible: !layer.visible });
              }}
              className={`text-sm w-6 h-6 flex items-center justify-center rounded ${layer.visible ? 'text-blue-500' : 'text-gray-300'}`}
            >
              {layer.visible ? '👁️' : '🚫'}
            </button>

            {/* Lock toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(layer.id, { locked: !layer.locked });
              }}
              className={`text-sm w-6 h-6 flex items-center justify-center rounded ${layer.locked ? 'text-orange-500' : 'text-gray-300'}`}
            >
              {layer.locked ? '🔒' : '🔓'}
            </button>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingId === layer.id ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => finishRename(layer.id)}
                  onKeyDown={e => e.key === 'Enter' && finishRename(layer.id)}
                  className="w-full text-xs px-1 py-0.5 border border-blue-300 rounded"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-xs text-gray-700 truncate block"
                  onDoubleClick={() => startRename(layer)}
                >
                  {layer.name}
                </span>
              )}
            </div>

            {/* Move up/down */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layers.indexOf(layer), layers.indexOf(layer) + 1);
                }}
                className="text-gray-400 hover:text-gray-600 text-xs leading-none"
                disabled={layers.indexOf(layer) === layers.length - 1}
              >
                ▲
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layers.indexOf(layer), layers.indexOf(layer) - 1);
                }}
                className="text-gray-400 hover:text-gray-600 text-xs leading-none"
                disabled={layers.indexOf(layer) === 0}
              >
                ▼
              </button>
            </div>

            {/* Delete */}
            {layers.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(layer.id);
                }}
                className="text-gray-300 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
