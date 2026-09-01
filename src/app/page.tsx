"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WhiteboardSettings } from '@/types';
import ToastContainer, { showToast } from '@/components/Toast';

export default function Home() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardCode, setBoardCode] = useState('');
  const [settings, setSettings] = useState<WhiteboardSettings>({
    allowDrawing: true,
    allowImageUpload: true,
    allowCopy: true,
    showCursors: true,
    boardType: 'public',
    background: 'white',
    showGrid: false,
    duration: 'unlimited',
  });

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/whiteboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boardName || 'Yeni Tahta', settings }),
      });
      const data = await res.json();
      router.push(`/tahta/${data.id}`);
    } catch {
      showToast('Tahta oluşturulamadı', 'error');
    }
  };

  const handleJoin = () => {
    const code = boardCode.trim();
    if (!code) {
      showToast('Lütfen bir tahta kodu girin', 'error');
      return;
    }
    // Extract ID from URL or use directly
    const match = code.match(/\/tahta\/([a-zA-Z0-9-]+)/);
    const id = match ? match[1] : code;
    router.push(`/tahta/${id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer />

      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="font-bold text-xl text-gray-900">Yöresel Beyaz Tahta</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Ücretsiz</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#ozellikler" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Özellikler</a>
            <a href="#hakkinda" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Hakkında</a>
            <button
              onClick={() => setShowShortcuts(true)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Kısayollar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          %100 Ücretsiz · Sınırsız · Türkçe
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
          Ücretsiz Ortak<br />
          <span className="text-blue-600">Beyaz Tahta</span>
        </h1>

        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
          Arkadaşlarınla, ekibinle veya öğrencilerinle aynı tahta üzerinde gerçek zamanlı çalış.
          Hiçbir ücret yok, hiçbir sınır yok.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200 flex items-center justify-center gap-2"
          >
            ✨ Tahta Oluştur
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full sm:w-auto bg-white text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-base border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            🔗 Tahtaya Katıl
          </button>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Özellikler</h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Tüm özellikler ücretsiz ve sınırsız</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <span className="text-2xl mb-2 block">{f.icon}</span>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="hakkinda" className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hakkında</h2>
          <p className="text-gray-500 leading-relaxed">
            Yöresel Beyaz Tahta, Whiteboard Fox benzeri çalışan ancak <strong>tüm özellikleri ücretsiz</strong> olan
            ve arayüzünün tamamı <strong>Türkçe</strong> olan bir ortak beyaz tahta uygulamasıdır.
            Ücretli özellik, abonelik veya reklam bulunmamaktadır.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        Yöresel Beyaz Tahta · Ücretsiz Ortak Beyaz Tahta
      </footer>

      {/* ===== CREATE MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">✨ Yeni Tahta Oluştur</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Board Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahta Adı</label>
                <input
                  type="text"
                  value={boardName}
                  onChange={e => setBoardName(e.target.value)}
                  placeholder="Örn: Tasarım Toplantısı"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Katılımcı İzinleri</label>
                <div className="space-y-2">
                  {[
                    { key: 'allowDrawing', label: 'Çizim yapabilir' },
                    { key: 'allowImageUpload', label: 'Görsel yükleyebilir' },
                    { key: 'allowCopy', label: 'Kopyalayabilir' },
                    { key: 'showCursors', label: 'İmleçler görünsün' },
                  ].map(p => (
                    <label key={p.key} className="flex items-center gap-3 cursor-pointer">
                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          settings[p.key as keyof WhiteboardSettings] ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        onClick={() => setSettings(prev => ({ ...prev, [p.key]: !prev[p.key as keyof WhiteboardSettings] }))}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${
                          settings[p.key as keyof WhiteboardSettings] ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                      <span className="text-sm text-gray-600">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Board Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahta Türü</label>
                <select
                  value={settings.boardType}
                  onChange={e => setSettings(prev => ({ ...prev, boardType: e.target.value as 'public' | 'private' }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">🌐 Herkese Açık</option>
                  <option value="private">🔒 Özel (Bağlantı ile)</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahta Süresi</label>
                <select
                  value={settings.duration || 'unlimited'}
                  onChange={e => setSettings(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1h">1 Saat</option>
                  <option value="1d">1 Gün</option>
                  <option value="7d">7 Gün</option>
                  <option value="14d">14 Gün</option>
                  <option value="30d">30 Gün</option>
                  <option value="90d">90 Gün</option>
                  <option value="1y">1 Yıl</option>
                  <option value="unlimited">♾️ Süresiz</option>
                </select>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                🚀 Tahtayı Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== JOIN MODAL ===== */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowJoinModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">🔗 Tahtaya Katıl</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahta Kodu veya Bağlantısı</label>
                <input
                  type="text"
                  value={boardCode}
                  onChange={e => setBoardCode(e.target.value)}
                  placeholder="Örn: 75668303-7417-4219 veya tam URL"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>

              <button
                onClick={handleJoin}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                🚀 Tahtaya Katıl
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SHORTCUTS MODAL ===== */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">⌨️ Klavye Kısayolları</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">{s.action}</span>
                    <kbd className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono border border-gray-200">{s.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const features = [
  { icon: '✏️', title: 'Serbest Çizim', desc: 'Kalem, silgi ve şekiller ile çizim yap' },
  { icon: '📝', title: 'Metin Ekleme', desc: 'Font, boyut ve renk özelleştirmesi' },
  { icon: '🖼️', title: 'Görsel Yükleme', desc: 'PNG, JPG, WebP ve GIF desteği' },
  { icon: '📐', title: 'Şekil Araçları', desc: 'Dikdörtgen, daire, ok ve daha fazlası' },
  { icon: '📑', title: 'Katman Sistemi', desc: 'Sınırsız katman ile çalışma' },
  { icon: '🔗', title: 'Paylaşım', desc: 'Bağlantı ve QR kod ile paylaş' },
  { icon: '👥', title: 'Gerçek Zamanlı', desc: 'Birden fazla kişi aynı anda çalışsın' },
  { icon: '💾', title: 'Dışa Aktarma', desc: 'PNG olarak indirme desteği' },
  { icon: '🌙', title: 'Karanlık Mod', desc: 'Göz yorgunluğunu azaltan tema' },
  { icon: '📱', title: 'Mobil Uyumlu', desc: 'Telefon ve tablette çalışır' },
  { icon: '⌨️', title: 'Kısayollar', desc: 'Hızlı erişim için klavye kısayolları' },
  { icon: '♾️', title: 'Sınırsız', desc: 'Ücret yok, sınır yok, abonelik yok' },
];

const shortcuts = [
  { key: 'Ctrl + Z', action: 'Geri Al' },
  { key: 'Ctrl + Y', action: 'Yinele' },
  { key: 'Ctrl + C', action: 'Kopyala' },
  { key: 'Ctrl + V', action: 'Yapıştır' },
  { key: 'Ctrl++', action: 'Yakınlaştır (2x)' },
  { key: 'Ctrl+-', action: 'Uzaklaştır (0.5x)' },
  { key: 'Ctrl+0', action: 'Zoom Sıfırla (%100)' },
  { key: 'V', action: 'Seçme Aracı' },
  { key: 'P', action: 'Kalem' },
  { key: 'E', action: 'Silgi' },
  { key: 'T', action: 'Metin' },
  { key: 'L', action: 'Çizgi' },
  { key: 'A', action: 'Ok' },
  { key: 'R', action: 'Dikdörtgen' },
  { key: 'D', action: 'Daire' },
  { key: 'H', action: 'El Aracı' },
  { key: 'Sil', action: 'Seçili Nesneyi Sil' },
  { key: 'Ctrl + Tekerlek', action: 'Zoom (sonsuz yakın/uzak)' },
  { key: 'Tekerlek', action: 'Tuvali Taşı' },
];
