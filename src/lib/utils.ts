// ==========================================
// Yardımcı fonksiyonlar
// ==========================================

import { v4 as uuidv4 } from 'uuid';

// Benzersiz ID oluştur
export function generateId(): string {
  return uuidv4().split('-').slice(0, 2).join('');
}

// Kısa tahta ID'si oluştur (daha okunabilir)
export function generateBoardId(): string {
  const part1 = Math.floor(10000000 + Math.random() * 90000000).toString();
  const part2 = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${part1}-${part2}`;
}

// Rastgele misafir adı
export function generateGuestName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Misafir_${num}`;
}

// Rastgele renk üret
export function generateRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// HEX'i RGB'ye çevir
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// RGB'yi HEX'e çevir
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Rengi string'den oku
export function parseColor(colorStr: string): string {
  // Zaten hex ise
  if (colorStr.startsWith('#')) return colorStr;
  // rgb() formatı
  if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }
  }
  return '#000000';
}

// Tahta süresini formatla
export function formatDuration(minutes: number): string {
  if (minutes === 0) return 'Süresiz';
  if (minutes < 60) return `${minutes} dakika`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} saat`;
  return `${Math.floor(minutes / 1440)} gün`;
}

// Tarihi formatla
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Klavye kısayolunu string'e çevir
export function getShortcutString(keys: string[]): string {
  return keys.join(' + ');
}

// LocalStorage'dan oku
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// LocalStorage'a yaz
export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Depolama hatası
  }
}

// Tarih formatı (saat:dakika)
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
