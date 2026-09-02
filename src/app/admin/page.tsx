"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface WhiteboardInfo {
  id: string;
  name: string;
  createdAt: number;
  actionCount: number;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [whiteboards, setWhiteboards] = useState<WhiteboardInfo[]>([]);
  const [broadcastBoardId, setBroadcastBoardId] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setIsLoggedIn(true);
        loadWhiteboards(data.token);
      } else {
        alert('Yanlış şifre!');
      }
    } catch {
      alert('Bağlantı hatası!');
    }
  };

  const loadWhiteboards = useCallback(async (tokenOverride?: string) => {
    setLoading(true);
    try {
      const t = tokenOverride || token;
      const res = await fetch(`/api/admin?token=${t}`);
      if (res.ok) {
        const data = await res.json();
        setWhiteboards(data.whiteboards || []);
      } else if (res.status === 401) {
        setIsLoggedIn(false);
        setToken('');
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  const sendBroadcast = async () => {
    if (!broadcastBoardId || !broadcastMessage.trim()) return;
    try {
      const res = await fetch(`/api/whiteboard/${broadcastBoardId}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMessage, adminKey: token }),
      });
      if (res.ok) {
        setBroadcastStatus('✅ Duyuru gönderildi!');
        setBroadcastMessage('');
        setTimeout(() => setBroadcastStatus(''), 3000);
      } else {
        setBroadcastStatus('❌ Gönderilemedi');
      }
    } catch {
      setBroadcastStatus('❌ Bağlantı hatası');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-3">🔐</span>
            <h1 className="text-xl font-bold text-white">Admin Paneli</h1>
            <p className="text-sm text-gray-400 mt-1">Yöresel Beyaz Tahta Yönetim</p>
          </div>
          <input
            type="password"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            placeholder="Yönetici şifresi"
            className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          <button
            onClick={login}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Giriş Yap →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h1 className="text-lg font-bold">Admin Paneli</h1>
              <p className="text-xs text-gray-400">Yöresel Beyaz Tahta Yönetim</p>
            </div>
          </div>
          <button
            onClick={() => { setIsLoggedIn(false); setAdminKey(''); setToken(''); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Broadcast Section */}
        <section className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📢</span> Duyuru Gönder
          </h2>
          <div className="space-y-3">
            <select
              value={broadcastBoardId}
              onChange={e => setBroadcastBoardId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tahta seçin...</option>
              {whiteboards.map(wb => (
                <option key={wb.id} value={wb.id}>{wb.name} ({wb.id})</option>
              ))}
            </select>
            <textarea
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="Duyuru mesajınızı yazın..."
              className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={sendBroadcast}
                disabled={!broadcastBoardId || !broadcastMessage.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                📤 Gönder
              </button>
              {broadcastStatus && (
                <span className="text-sm">{broadcastStatus}</span>
              )}
            </div>
          </div>
        </section>

        {/* Whiteboards List */}
        <section className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>📋</span> Tahtalar ({whiteboards.length})
            </h2>
            <button
              onClick={() => loadWhiteboards()}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              {loading ? '⏳ Yükleniyor...' : '🔄 Yenile'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-3 px-4">Tahta Adı</th>
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Oluşturulma</th>
                  <th className="text-left py-3 px-4">Çizim Sayısı</th>
                  <th className="text-left py-3 px-4">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {whiteboards.map(wb => (
                  <tr key={wb.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 font-medium">{wb.name}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{wb.id}</td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(wb.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs">
                        {wb.actionCount} çizim
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`/tahta/${wb.id}`}
                        target="_blank"
                        rel="noopener"
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium transition-colors"
                      >
                        Aç →
                      </a>
                    </td>
                  </tr>
                ))}
                {whiteboards.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {loading ? 'Yükleniyor...' : 'Henüz tahta yok'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-blue-400">{whiteboards.length}</div>
            <div className="text-sm text-gray-400 mt-1">Toplam Tahta</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-green-400">
              {whiteboards.reduce((sum, wb) => sum + wb.actionCount, 0)}
            </div>
            <div className="text-sm text-gray-400 mt-1">Toplam Çizim</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-purple-400">
              {whiteboards.filter(wb => wb.actionCount > 0).length}
            </div>
            <div className="text-sm text-gray-400 mt-1">Aktif Tahta</div>
          </div>
        </section>
      </div>
    </div>
  );
}
