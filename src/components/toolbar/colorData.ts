// Renk paletleri

export const BASIC_COLORS = [
  { name: 'Siyah', hex: '#000000', tr: 'Siyah' },
  { name: 'Mavi', hex: '#2b78e4', tr: 'Mavi' },
  { name: 'Aqua', hex: '#00d4ff', tr: 'Aqua' },
  { name: 'Kırmızı', hex: '#e74c3c', tr: 'Kırmızı' },
  { name: 'Yeşil', hex: '#2ecc71', tr: 'Yeşil' },
  { name: 'Mor', hex: '#9b59b6', tr: 'Mor' },
  { name: 'Sarı', hex: '#f1c40f', tr: 'Sarı' },
  { name: 'Turuncu', hex: '#e67e22', tr: 'Turuncu' },
  { name: 'Pembe', hex: '#e91e8c', tr: 'Pembe' },
  { name: 'Beyaz', hex: '#ffffff', tr: 'Beyaz' },
  { name: 'Gri', hex: '#95a5a6', tr: 'Gri' },
  { name: 'Kahverengi', hex: '#8B4513', tr: 'Kahverengi' },
];

export const EXTRA_COLORS = [
  { name: 'Beyaz', hex: '#ffffff' }, { name: 'Safir', hex: '#0f52ba' },
  { name: 'Bebek Mavisi', hex: '#89cff0' }, { name: 'Mor Salkım', hex: '#c4a4d5' },
  { name: 'Bebek Pembesi', hex: '#f4c2c2' }, { name: 'Tarçın', hex: '#d2691e' },
  { name: 'Ten 1', hex: '#f5deb3' }, { name: 'Kum', hex: '#c2b280' },
  { name: 'Sorbe', hex: '#ff6b6b' }, { name: 'Antep Fıstığı', hex: '#93c572' },
  { name: 'Kabuk', hex: '#f5f5dc' }, { name: 'Bulut', hex: '#d3d3d3' }, { name: 'Gökyüzü', hex: '#87ceeb' },
  { name: 'Peri', hex: '#ccccff' }, { name: 'Lavanta', hex: '#e6e6fa' },
  { name: 'Şeker', hex: '#ffb3de' }, { name: 'Somon', hex: '#fa8072' },
  { name: 'Ten 2', hex: '#deb887' }, { name: 'Şeftali', hex: '#ffdab9' },
  { name: 'Tereyağı', hex: '#fffd74' }, { name: 'İlkbahar', hex: '#00ff7f' },
  { name: 'Deniz', hex: '#008080' }, { name: 'Gümüş', hex: '#c0c0c0' }, { name: 'Azure', hex: '#007fff' },
  { name: 'Tavus', hex: '#008080' }, { name: 'Mor', hex: '#ee82ee' },
  { name: 'Flamingo', hex: '#fc8eac' }, { name: 'Gül', hex: '#ff007f' },
  { name: 'Ten 3', hex: '#d2b48c' }, { name: 'Kayısı', hex: '#fbceb1' },
  { name: 'Limon', hex: '#fff44f' }, { name: 'Yosun', hex: '#50c878' },
  { name: 'Zümrüt', hex: '#50c878' }, { name: 'Kül', hex: '#787878' }, { name: 'Turkuaz', hex: '#40e0d0' },
  { name: 'Prusya', hex: '#003153' }, { name: 'Üzüm', hex: '#6f2da8' },
  { name: 'Sıcak Pembe', hex: '#ff69b4' }, { name: 'Kızıl', hex: '#dc143c' },
  { name: 'Ten 4', hex: '#d2691e' }, { name: 'Turuncu', hex: '#ffa500' },
  { name: 'Muz', hex: '#ffe135' }, { name: 'Çayır', hex: '#00ff00' },
  { name: 'Yaprak', hex: '#228b22' }, { name: 'Kömür', hex: '#36454f' }, { name: 'Çelik', hex: '#71797e' },
  { name: 'Okyanus', hex: '#006994' }, { name: 'Erik', hex: '#660066' },
  { name: 'Kiraz', hex: '#de3163' }, { name: 'Maun', hex: '#c04000' },
  { name: 'Ten 5', hex: '#b8860b' }, { name: 'Bronz', hex: '#cd7f32' },
  { name: 'Hardal', hex: '#ffdb58' }, { name: 'Çam', hex: '#01796f' },
  { name: 'Jade', hex: '#00a86b' }, { name: 'Siyah', hex: '#000000' }, { name: 'Arduaz', hex: '#708090' },
  { name: 'Gece', hex: '#191970' }, { name: 'Mürdüm', hex: '#4b0082' },
  { name: 'Sangria', hex: '#9b0323' }, { name: 'Merlot', hex: '#73343a' },
  { name: 'Ten 6', hex: '#8b7355' }, { name: 'Ceviz', hex: '#5b4a3f' },
  { name: 'Pirinç', hex: '#b5a642' }, { name: 'Turşu', hex: '#4a7023' },
  { name: 'Orman', hex: '#228b22' },
];

export interface BrushStyle {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const BRUSH_STYLES: BrushStyle[] = [
  { id: 'marker', label: 'Fırça', icon: '🖌️', description: 'Normal yumuşak fırça çizgisi' },
  { id: 'pencil', label: 'Kurşun Kalem', icon: '✏️', description: 'İnce, keskin kurşun kalem çizgisi' },
  { id: 'calligraphy', label: 'Kaligrafi', icon: '✒️', description: 'Açıya göre değişken kalınlık' },
  { id: 'airbrush', label: 'Sprey', icon: '💨', description: 'Yayılımı olan sprey efekti' },
  { id: 'neon', label: 'Neon', icon: '💡', description: 'Parlak neon ışık efekti' },
  { id: 'textured', label: 'Dokulu', icon: '🧽', description: 'Doku hissi veren fırça' },
];

export interface BrushSize {
  id: string;
  label: string;
  row: number;
  size: number;
}

export const BRUSH_SIZES: BrushSize[] = [
  { id: 'f1', label: 'En İnce 1', row: 1, size: 1 },
  { id: 'f2', label: 'İnce 1', row: 1, size: 2 },
  { id: 'm1', label: 'Orta 1', row: 1, size: 4 },
  { id: 'l1', label: 'Kalın 1', row: 1, size: 8 },
  { id: 'xl1', label: 'En Kalın 1', row: 1, size: 14 },
  { id: 'f3', label: 'En İnce 2', row: 2, size: 1.5 },
  { id: 'f4', label: 'İnce 2', row: 2, size: 3 },
  { id: 'm2', label: 'Orta 2', row: 2, size: 5 },
  { id: 'l2', label: 'Kalın 2', row: 2, size: 10 },
  { id: 'xl2', label: 'En Kalın 2', row: 2, size: 18 },
  { id: 'f5', label: 'En İnce 3', row: 3, size: 2 },
  { id: 'f6', label: 'İnce 3', row: 3, size: 3.5 },
  { id: 'm3', label: 'Orta 3', row: 3, size: 6 },
  { id: 'l3', label: 'Kalın 3', row: 3, size: 12 },
  { id: 'xl3', label: 'En Kalın 3', row: 3, size: 22 },
  { id: 'f7', label: 'En İnce 4', row: 4, size: 2.5 },
  { id: 'f8', label: 'İnce 4', row: 4, size: 4.5 },
  { id: 'm4', label: 'Orta 4', row: 4, size: 7 },
  { id: 'l4', label: 'Kalın 4', row: 4, size: 16 },
  { id: 'xl4', label: 'En Kalın 4', row: 4, size: 28 },
];

export interface ShapeOption {
  id: string;
  label: string;
  icon: string;
  tool: string;
}

// Metin kaldırıldı
export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: 'freehand', label: 'Serbest', icon: '〰️', tool: 'freehand' },
  { id: 'line', label: 'Çizgi', icon: '╱', tool: 'line' },
  { id: 'circle', label: 'Daire', icon: '○', tool: 'circle' },
  { id: 'ellipse', label: 'Elips', icon: '⬭', tool: 'ellipse' },
  { id: 'square', label: 'Kare', icon: '□', tool: 'square' },
  { id: 'rectangle', label: 'Dikdörtgen', icon: '▭', tool: 'rectangle' },
  { id: 'diamond', label: 'Elmas', icon: '◇', tool: 'diamond' },
  { id: 'arrow', label: 'Ok', icon: '→', tool: 'arrow' },
  { id: 'star', label: 'Yıldız', icon: '☆', tool: 'star' },
  { id: 'speech', label: 'Konuşma', icon: '💬', tool: 'speech' },
  { id: 'triangle', label: 'Üçgen', icon: '△', tool: 'triangle' },
  { id: 'image', label: 'Görsel', icon: '🖼️', tool: 'image' },
];
