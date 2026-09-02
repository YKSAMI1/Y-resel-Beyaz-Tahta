"use client";

import React, { useState, useEffect } from 'react';

const TUTORIAL_STEPS = [
  {
    icon: '✏️',
    title: 'Çizim Araçları',
    desc: 'Soldaki menüden "Çiz" tuşuna basarak çizmeye başlayın. Kalem, fırça, neon ve daha birçok stil var!',
    color: '#4a90d9',
  },
  {
    icon: '🧽',
    title: 'Silgi Aracı',
    desc: 'Bir şeyi silmek için silgi aracını kullanın. Üzerine tıklayarak veya sürükleyerek silebilirsiniz.',
    color: '#ef4444',
  },
  {
    icon: '✋',
    title: 'Hareket Et',
    desc: 'Tahtayı kaydırmak için "Hareket et" aracını kullanın. Farenin orta tuşuyla da hızlıca hareket ettirebilirsiniz.',
    color: '#10b981',
  },
  {
    icon: '⬚',
    title: 'Seç & Taşı',
    desc: 'Nesneleri seçmek için "Seç" aracını kullanın. Sürüklemeyle taşıyın, köşelerden boyutlandırın, dairesel tutamaçla döndürün.',
    color: '#8b5cf6',
  },
  {
    icon: '🔍',
    title: 'Yakınlaştırma',
    desc: 'Fare tekerleği ile yakınlaştırın/uzaklaştırın. Telefonda iki parmakla pinch-zoom yapın.',
    color: '#f59e0b',
  },
  {
    icon: '🔗',
    title: 'Paylaş',
    desc: 'Üstteki "Paylaş" butonuyla tahtanızı başkalarıyla paylaşın. Linke tıklayan herkes katılabilir!',
    color: '#06b6d4',
  },
];

export default function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if tutorial was already seen on this device
    const seen = localStorage.getItem('yoresel_tutorial_seen');
    if (seen) {
      onDone();
      return;
    }
    // Small delay for smooth appearance
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [onDone]);

  const handleDone = () => {
    localStorage.setItem('yoresel_tutorial_seen', 'true');
    setIsVisible(false);
    setTimeout(onDone, 300);
  };

  if (!isVisible) return null;

  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden transform transition-all duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500 rounded-r"
            style={{
              width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%`,
              backgroundColor: current.color,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-4xl"
            style={{ backgroundColor: current.color + '15' }}
          >
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.desc}</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? 'scale-125' : 'bg-gray-300'
              }`}
              style={i === step ? { backgroundColor: current.color } : {}}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={handleDone}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Atla
          </button>
          {isLast ? (
            <button
              onClick={handleDone}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: current.color }}
            >
              Başla! 🎨
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: current.color }}
            >
              İleri →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
