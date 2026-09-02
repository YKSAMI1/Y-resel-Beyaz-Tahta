"use client";

import React, { useState, useEffect } from 'react';
import { WhiteboardSettings } from '@/types';

interface SnapshotInfo {
  id: string;
  name: string;
  timestamp: number;
  createdBy: string;
  isAuto: boolean;
}

interface SettingsPanelProps {
  settings: WhiteboardSettings;
  onUpdate: (settings: Partial<WhiteboardSettings>) => void;
  onClose: () => void;
  onDelete: () => void;
  onClear: () => void;
  onSaveSnapshot?: (name: string, createdBy?: string) => void;
  onLoadSnapshot?: (snapshotId: string) => void;
  onDeleteSnapshot?: (snapshotId: string) => void;
  boardId?: string;
  nickname?: string;
}

export default function SettingsPanel({ settings, onUpdate, onClose, onDelete, onClear, onSaveSnapshot, onLoadSnapshot, onDeleteSnapshot, boardId, nickname }: SettingsPanelProps) {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [loadingSnaps, setLoadingSnaps] = useState(false);

  const backgrounds = [
    { id: 'white', label: 'Beyaz', color: '#ffffff' },
    { id: 'black', label: 'Siyah', color: '#1a1a1a' },
    { id: 'gray', label: 'Gri', color: '#f3f4f6' },
    { id: 'dots', label: 'Noktalı', color: '#f8f9fa' },
    { id: 'grid', label: 'Kareli', color: '#f0f0f0' },
  ];

  const loadSnapshots = async () => {
    if (!boardId) return;
    setLoadingSnaps(true);
    try {
      const res = await fetch(`/api/whiteboard/${boardId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch { /* ignore */ }
    setLoadingSnaps(false);
  };

  useEffect(() => {
    if (boardId) loadSnapshots();
  }, [boardId]);

  const handleSaveSnapshot = () => {
    const name = snapshotName.trim() || `Snapshot ${new Date().toLocaleString('tr-TR')}`;
    onSaveSnapshot?.(name, nickname || 'unknown');
    setSnapshotName('');
    setTimeout(loadSnapshots, 500);
  };

  const userSnapshots = snapshots.filter(s => !s.isAuto);
  const autoSnapshots = snapshots.filter(s => s.isAuto);

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

          {/* ===== SNAPSHOTS ===== */}
          {onSaveSnapshot && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">📸 Snapshot (Anlık Kayıt)</h4>
              <p className="text-xs text-gray-400 mb-3">Kanusun şu anki halini kaydedin. Sorun yaşadığınızda geri dönebilirsiniz.</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={snapshotName}
                  onChange={e => setSnapshotName(e.target.value)}
                  placeholder="Snapshot adı (isteğe bağlı)"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleSaveSnapshot()}
                />
                <button
                  onClick={handleSaveSnapshot}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  💾 Kaydet
                </button>
              </div>
              {/* Kullanıcı Snapshotları */}
              {userSnapshots.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-gray-500 mb-1">👤 Senin Kayıtların</h5>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {userSnapshots.map(snap => (
                      <div key={snap.id} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                        <div>
                          <div className="text-xs font-medium text-gray-700">{snap.name}</div>
                          <div className="text-[10px] text-gray-400">{snap.createdBy} • {new Date(snap.timestamp).toLocaleString('tr-TR')}</div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => onLoadSnapshot?.(snap.id)} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-medium hover:bg-green-200">↩ Yükle</button>
                          <button onClick={() => { onDeleteSnapshot?.(snap.id); setTimeout(loadSnapshots, 300); }} className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium hover:bg-red-200">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Otomatik Snapshotlar */}
              {autoSnapshots.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-gray-500 mb-1">🤖 Otomatik Kayıtlar (15 dk)</h5>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {autoSnapshots.map(snap => (
                      <div key={snap.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-xs font-medium text-gray-700">{snap.name}</div>
                          <div className="text-[10px] text-gray-400">{new Date(snap.timestamp).toLocaleString('tr-TR')}</div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => onLoadSnapshot?.(snap.id)} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-medium hover:bg-green-200">↩ Yükle</button>
                          <button onClick={() => { onDeleteSnapshot?.(snap.id); setTimeout(loadSnapshots, 300); }} className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-lg font-medium hover:bg-red-200">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {loadingSnaps && <p className="text-xs text-gray-400 mt-2">Yükleniyor...</p>}
            </div>
          )}

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
