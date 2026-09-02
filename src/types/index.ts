// ==========================================
// Tüm uygulama tipleri
// ==========================================

// Araç tipleri
export type Tool =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'star'
  | 'diamond'
  | 'speech'
  | 'freehand'
  | 'image'
  | 'hand'
  | 'fillbucket'
  | 'lasso'
  | 'inspect';

export interface WhiteboardSettings {
  allowDrawing: boolean;
  allowImageUpload: boolean;
  allowCopy: boolean;
  showCursors: boolean;
  boardType: 'public' | 'private';
  background: string;
  showGrid: boolean;
  duration?: string;
}

export interface Whiteboard {
  id: string;
  name: string;
  settings: WhiteboardSettings;
  ownerId: string;
  createdAt: number;
  expiresAt: number | null;
  layers: Layer[];
  blockedUsers: string[];
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  cursorPosition?: { x: number; y: number };
  isOwner: boolean;
  isDrawing: boolean;
}

export interface DrawAction {
  id: string;
  type: Tool;
  points: { x: number; y: number }[];
  color: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  layerId: string;
  userId: string;
  timestamp: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  brushStyle?: string;
  // Bitmap data for bucket fill / lasso fill
  fillBitmap?: string; // base64 PNG
  fillBitmapOrigin?: { x: number; y: number };
  // Lasso polygon points
  lassoPoints?: { x: number; y: number }[];
  // Seçim alanı (area selection)
  selectionBox?: { x: number; y: number; w: number; h: number };
  // Seçili nesne ID'leri (area selection sonucu)
  selectedIds?: string[];
  // Rotation angle in degrees
  rotation?: number;
  // Temp: original points before multi-rotate (not serialized)
  _origPointsBeforeRotate?: { x: number; y: number }[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

export interface ColorPalette {
  name: string;
  colors: string[];
}

export interface DurationOption {
  label: string;
  value: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { label: '1 Saat', value: '1h' },
  { label: '1 Gün', value: '1d' },
  { label: '7 Gün', value: '7d' },
  { label: '14 Gün', value: '14d' },
  { label: '30 Gün', value: '30d' },
  { label: '90 Gün', value: '90d' },
  { label: '1 Yıl', value: '1y' },
  { label: 'Süresiz', value: 'unlimited' },
];

export const GRID_SIZE = 20;

export const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl + Z', action: 'Geri Al' },
  { keys: 'Ctrl + Y', action: 'Yinele' },
  { keys: 'Ctrl + C', action: 'Kopyala' },
  { keys: 'Ctrl + V', action: 'Yapıştır' },
  { keys: 'Ctrl + X', action: 'Kes' },
  { keys: 'Delete', action: 'Sil' },
  { keys: 'Space', action: 'Tuvali taşı (sürükle)' },
  { keys: 'Ctrl + +', action: 'Yakınlaştır' },
  { keys: 'Ctrl + -', action: 'Uzaklaştır' },
];
