"use client";

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool, Layer, DrawAction, WhiteboardSettings, Participant } from '@/types';
import { generateId } from '@/lib/utils';

interface WhiteboardCanvasProps {
  tool: Tool;
  color: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  layers: Layer[];
  activeLayerId: string;
  settings: WhiteboardSettings;
  onAddAction: (action: DrawAction) => void;
  onDeleteAction?: (id: string) => void;
  actions: DrawAction[];
  participants: Participant[];
  brushStyle?: string;
  onToolChange?: (tool: Tool) => void;
  onCanvasInteract?: () => void;
  onMoveSelected?: (dx: number, dy: number) => void;
  onMoveCommit?: () => void;
  onUpdateActions?: (updater: (prev: DrawAction[]) => DrawAction[]) => void;
  onUpdateCommit?: (oldPositions: Map<string, {x:number;y:number}[]>) => void;
  onSyncActions?: () => void;
  onActionsChanged?: (ids: string[]) => void;
  clientId?: string;
}

export interface WhiteboardCanvasHandle {
  setZoom: (z: number) => void;
  getZoom: () => number;
  fitToScreen: () => void;
  resetZoom: () => void;
  exportFullCanvas: () => void;
  deleteSelected: () => void;
  getSelectedIds: () => string[];
  moveSelected: (dx: number, dy: number) => void;
}

const MIN_ZOOM = 0.01;
const MAX_ZOOM = 500;

// Image cache to prevent flicker on redraw
const imageCache = new Map<string, HTMLImageElement>();
function getCachedImage(src: string): HTMLImageElement | null {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) return cached;
  if (!cached) {
    const img = new Image();
    img.src = src;
    img.onload = () => { /* stored in map */ };
    imageCache.set(src, img);
  }
  return null;
}

function getAdaptiveGridSize(zoom: number): number {
  if (zoom > 5) return 10;
  if (zoom > 2) return 15;
  if (zoom > 0.5) return 30;
  if (zoom > 0.1) return 100;
  if (zoom > 0.02) return 500;
  return 1000;
}

function formatZoom(z: number): string {
  const pct = z * 100;
  if (pct >= 1000) return `${(pct / 1000).toFixed(1)}K%`;
  if (pct >= 100) return `${Math.round(pct)}%`;
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}

function smoothPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else if (points.length === 3) {
    ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
  } else {
    // Catmull-Rom to Bezier for smoother curves
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
}

function drawCalligraphy(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const angle = Math.atan2(dy, dx);
    const widthMult = 0.3 + Math.abs(Math.sin(angle + Math.PI / 4)) * 1.4;
    const w = baseWidth * widthMult;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMarker(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  smoothPath(ctx, points);
  ctx.stroke();
  ctx.restore();
}

function drawPencil(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity * 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, baseWidth * 0.6);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Multiple thin passes for pencil texture
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = opacity * (pass === 0 ? 0.5 : 0.3);
    ctx.beginPath();
    ctx.moveTo(points[0].x + (pass ? 0.3 : -0.3), points[0].y + (pass ? 0.2 : -0.2));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + (pass ? 0.3 : -0.3), points[i].y + (pass ? 0.2 : -0.2));
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawAirbrush(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number) {
  if (points.length < 1) return;
  ctx.save();
  const r = baseWidth * 2;
  for (let i = 0; i < points.length; i += 3) {
    const gradient = ctx.createRadialGradient(points[i].x, points[i].y, 0, points[i].x, points[i].y, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.globalAlpha = opacity * 0.08;
    ctx.fillStyle = gradient;
    ctx.fillRect(points[i].x - r, points[i].y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawNeon(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number) {
  if (points.length < 2) return;
  ctx.save();
  // Outer glow
  ctx.strokeStyle = color;
  ctx.lineWidth = baseWidth * 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = opacity * 0.15;
  ctx.shadowColor = color;
  ctx.shadowBlur = baseWidth * 8;
  smoothPath(ctx, points);
  ctx.stroke();
  // Inner bright line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, baseWidth * 0.4);
  ctx.globalAlpha = opacity * 0.9;
  ctx.shadowBlur = baseWidth * 3;
  ctx.shadowColor = color;
  smoothPath(ctx, points);
  ctx.stroke();
  ctx.restore();
}

function seededRandom(seed: number): number {
  let x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawTextured(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const steps = Math.max(1, Math.floor(dist / 2));
    for (let s = 0; s < steps; s++) {
      const seed = i * 1000 + s;
      const t = s / steps;
      const x = points[i-1].x + dx * t;
      const y = points[i-1].y + dy * t;
      const jitter = baseWidth * 0.4;
      ctx.globalAlpha = opacity * (0.3 + seededRandom(seed) * 0.4);
      ctx.beginPath();
      ctx.arc(x + (seededRandom(seed + 1)-0.5)*jitter, y + (seededRandom(seed + 2)-0.5)*jitter, 1 + seededRandom(seed + 3) * baseWidth * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawWithBrushStyle(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, baseWidth: number, opacity: number, brushStyle: string) {
  switch (brushStyle) {
    case 'calligraphy': drawCalligraphy(ctx, points, color, baseWidth, opacity); break;
    case 'pencil': drawPencil(ctx, points, color, baseWidth, opacity); break;
    case 'airbrush': drawAirbrush(ctx, points, color, baseWidth, opacity); break;
    case 'neon': drawNeon(ctx, points, color, baseWidth, opacity); break;
    case 'textured': drawTextured(ctx, points, color, baseWidth, opacity); break;
    default: drawMarker(ctx, points, color, baseWidth, opacity); break;
  }
}

// Rotate a point around a center by angle (degrees)
function rotatePoint(pt: { x: number; y: number }, center: { x: number; y: number }, angleDeg: number): { x: number; y: number } {
  if (!angleDeg) return pt;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = pt.x - center.x, dy = pt.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

function isPointNearLine(pt: { x: number; y: number }, points: { x: number; y: number }[], threshold: number): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) { if (Math.hypot(pt.x - a.x, pt.y - a.y) < threshold) return true; continue; }
    let t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    if (Math.hypot(pt.x - projX, pt.y - projY) < threshold) return true;
  }
  return false;
}

function isPointInAction(pt: { x: number; y: number }, action: DrawAction): boolean {
  // For rotated objects, rotate the test point back to un-rotated space
  const bbox = getActionBBox(action);
  const center = bbox ? { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 } : { x: 0, y: 0 };
  const rot = action.rotation || 0;
  const rpt = rot ? rotatePoint(pt, center, -rot) : pt;

  if (action.type === 'pen' || action.type === 'freehand') {
    const threshold = Math.max(action.strokeWidth / 2, 8);
    return isPointNearLine(rpt, action.points, threshold);
  }
  if (action.type === 'eraser') return false;
  if (action.type === 'text') {
    const fontSize = action.fontSize || 16;
    const lines = (action.text || '').split('\n');
    const maxLineW = Math.max(...lines.map(l => l.length * fontSize * 0.6), 50);
    return rpt.x >= action.points[0].x - 5 && rpt.x <= action.points[0].x + maxLineW + 5 &&
           rpt.y >= action.points[0].y - 5 && rpt.y <= action.points[0].y + lines.length * fontSize * 1.2 + 5;
  }
  if (action.type === 'image') {
    return rpt.x >= action.points[0].x && rpt.x <= action.points[0].x + (action.imageWidth || 200) &&
           rpt.y >= action.points[0].y && rpt.y <= action.points[0].y + (action.imageHeight || 150);
  }
  if (action.type === 'fillbucket') {
    return Math.hypot(rpt.x - action.points[0].x, rpt.y - action.points[0].y) < 30;
  }
  if (action.points.length < 2) return false;
  const x1 = Math.min(action.points[0].x, action.points[1].x);
  const y1 = Math.min(action.points[0].y, action.points[1].y);
  const x2 = Math.max(action.points[0].x, action.points[1].x);
  const y2 = Math.max(action.points[0].y, action.points[1].y);
  const margin = Math.max(action.strokeWidth, 8);
  // For shapes (rectangle, square, circle, etc.) use full bbox hit
  const shapeTypes = ['rectangle', 'square', 'circle', 'ellipse', 'triangle', 'star', 'diamond', 'speech', 'arrow'];
  if (shapeTypes.includes(action.type)) {
    return rpt.x >= x1 - margin && rpt.x <= x2 + margin && rpt.y >= y1 - margin && rpt.y <= y2 + margin;
  }
  // For lines, check near the line
  return pt.x >= x1 - margin && pt.x <= x2 + margin && pt.y >= y1 - margin && pt.y <= y2 + margin;
}

function boxesOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

// Compute a unified bounding box for multiple selected actions
function getUnifiedBBox(actions: DrawAction[], ids: string[]): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let count = 0;
  for (const action of actions) {
    if (!ids.includes(action.id)) continue;
    const b = getActionBBox(action);
    if (!b) continue;
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
    count++;
  }
  if (count === 0) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Check if a point is inside a rotated rectangle
function isPointInRotatedRect(pt: { x: number; y: number }, center: { x: number; y: number }, w: number, h: number, angleDeg: number): boolean {
  const rpt = rotatePoint(pt, center, -angleDeg);
  return rpt.x >= center.x - w / 2 && rpt.x <= center.x + w / 2 &&
         rpt.y >= center.y - h / 2 && rpt.y <= center.y + h / 2;
}

function getActionBBox(action: DrawAction): { x: number; y: number; w: number; h: number } | null {
  if (action.type === 'text') {
    const fontSize = action.fontSize || 16;
    const lines = (action.text || '').split('\n');
    const maxLineW = Math.max(...lines.map(l => l.length * fontSize * 0.6), 50);
    return { x: action.points[0].x, y: action.points[0].y, w: maxLineW, h: lines.length * fontSize * 1.2 };
  }
  if (action.type === 'image') {
    return { x: action.points[0].x, y: action.points[0].y, w: action.imageWidth || 200, h: action.imageHeight || 150 };
  }
  if (action.type === 'fillbucket') {
    return { x: action.points[0].x - 30, y: action.points[0].y - 30, w: 60, h: 60 };
  }
  if (action.points.length < 2) return null;
  const xs = action.points.map(p => p.x);
  const ys = action.points.map(p => p.y);
  const m = action.strokeWidth / 2 + 5;
  return { x: Math.min(...xs) - m, y: Math.min(...ys) - m, w: Math.max(...xs) - Math.min(...xs) + m * 2, h: Math.max(...ys) - Math.min(...ys) + m * 2 };
}

// ===== FLOOD FILL ALGORITHM =====
function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: { r: number; g: number; b: number; a: number },
  tolerance: number = 64
): { imageData: ImageData; minX: number; minY: number; width: number; height: number } | null {
  const { width, height, data } = imageData;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;
  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx], startG = data[startIdx + 1], startB = data[startIdx + 2], startA = data[startIdx + 3];
  if (startR === fillColor.r && startG === fillColor.g && startB === fillColor.b && startA === fillColor.a) return null;
  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [[startX, startY]];
  const match = (idx: number) => Math.abs(data[idx] - startR) <= tolerance && Math.abs(data[idx + 1] - startG) <= tolerance && Math.abs(data[idx + 2] - startB) <= tolerance && Math.abs(data[idx + 3] - startA) <= tolerance;
  let minX = startX, minY = startY, maxX = startX, maxY = startY;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    const pi = cy * width + cx;
    if (visited[pi]) continue;
    const ci = pi * 4;
    if (!match(ci)) continue;
    visited[pi] = 1;
    data[ci] = fillColor.r; data[ci + 1] = fillColor.g; data[ci + 2] = fillColor.b; data[ci + 3] = fillColor.a;
    minX = Math.min(minX, cx); minY = Math.min(minY, cy); maxX = Math.max(maxX, cx); maxY = Math.max(maxY, cy);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  if (minX === startX && minY === startY && maxX === startX && maxY === startY) return null;
  // Edge expansion: fill any remaining edge pixels near the fill boundary
  for (let pass = 0; pass < 2; pass++) {
    for (let y = Math.max(0, minY - 2); y <= Math.min(height - 1, maxY + 2); y++) {
      for (let x = Math.max(0, minX - 2); x <= Math.min(width - 1, maxX + 2); x++) {
        const pi = y * width + x;
        if (visited[pi]) continue;
        const ci = pi * 4;
        // Check if any neighbor is filled
        const neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
        let nearFilled = false;
        for (const [dx, dy] of neighbors) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const ni = ny * width + nx;
            if (visited[ni]) { nearFilled = true; break; }
          }
        }
        if (nearFilled && match(ci)) {
          visited[pi] = 1;
          data[ci] = fillColor.r; data[ci + 1] = fillColor.g; data[ci + 2] = fillColor.b; data[ci + 3] = fillColor.a;
        }
      }
    }
  }
  const pad = 2;
  const rx = Math.max(0, minX - pad), ry = Math.max(0, minY - pad);
  const rw = Math.min(width - rx, maxX - rx + pad * 2 + 1);
  const rh = Math.min(height - ry, maxY - ry + pad * 2 + 1);
  const cropped = new ImageData(rw, rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const si = ((ry + y) * width + (rx + x)) * 4;
      const di = (y * rw + x) * 4;
      cropped.data[di] = data[si]; cropped.data[di + 1] = data[si + 1]; cropped.data[di + 2] = data[si + 2]; cropped.data[di + 3] = data[si + 3];
    }
  }
  return { imageData: cropped, minX: rx, minY: ry, width: rw, height: rh };
}

function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '');
  if (h.length === 3) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 255 };
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16), a: 255 };
}

function generateFillBitmap(
  actions: DrawAction[], layers: Layer[], clickPoint: { x: number; y: number },
  fillColorHex: string, canvasW: number, canvasH: number, drawFn: (ctx: CanvasRenderingContext2D, acts: DrawAction[], lrs: Layer[], _z: number) => void
): { bitmap: string; origin: { x: number; y: number } } | null {
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasW; offscreen.height = canvasH;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;
  // Draw white background first
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);
  drawFn(ctx, actions, layers, 1);
  const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
  const fillRgb = hexToRgb(fillColorHex);
  const cx = Math.round(clickPoint.x);
  const cy = Math.round(clickPoint.y);
  if (cx < 0 || cx >= canvasW || cy < 0 || cy >= canvasH) return null;
  const result = floodFill(imgData, cx, cy, fillRgb, 64);
  if (!result) return null;
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = result.width; resultCanvas.height = result.height;
  const rCtx = resultCanvas.getContext('2d');
  if (!rCtx) return null;
  rCtx.putImageData(result.imageData, 0, 0);
  return { bitmap: resultCanvas.toDataURL('image/png'), origin: { x: result.minX, y: result.minY } };
}

// ===== LASSO FILL =====
function generateLassoBitmap(
  actions: DrawAction[], layers: Layer[], lassoPts: { x: number; y: number }[],
  fillColorHex: string, canvasW: number, canvasH: number, drawFn: (ctx: CanvasRenderingContext2D, acts: DrawAction[], lrs: Layer[], _z: number) => void
): { bitmap: string; origin: { x: number; y: number } } | null {
  if (lassoPts.length < 3) return null;
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasW; offscreen.height = canvasH;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;
  drawFn(ctx, actions, layers, 1);
  // Create lasso mask
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = fillColorHex;
  ctx.beginPath();
  ctx.moveTo(lassoPts[0].x, lassoPts[0].y);
  for (let i = 1; i < lassoPts.length; i++) ctx.lineTo(lassoPts[i].x, lassoPts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Get bounding box of lasso
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of lassoPts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const pad = 2;
  const rx = Math.max(0, Math.floor(minX) - pad), ry = Math.max(0, Math.floor(minY) - pad);
  const rw = Math.min(canvasW - rx, Math.ceil(maxX) - rx + pad * 2 + 1);
  const rh = Math.min(canvasH - ry, Math.ceil(maxY) - ry + pad * 2 + 1);
  const cropped = ctx.getImageData(rx, ry, rw, rh);
  // Create new canvas with only the lasso area
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = rw; resultCanvas.height = rh;
  const rCtx = resultCanvas.getContext('2d');
  if (!rCtx) return null;
  rCtx.putImageData(cropped, 0, 0);
  return { bitmap: resultCanvas.toDataURL('image/png'), origin: { x: rx, y: ry } };
}

// Store drawAllActions globally for bitmap generation
let drawAllActionsGlobal: (ctx: CanvasRenderingContext2D, acts: DrawAction[], lrs: Layer[], _z: number) => void;

const WhiteboardCanvas = forwardRef<WhiteboardCanvasHandle, WhiteboardCanvasProps>(function WhiteboardCanvas(
  { tool, color, fillColor, strokeWidth, opacity, fontSize, fontFamily, layers, activeLayerId, settings, onAddAction, onDeleteAction, actions, participants, brushStyle = 'marker', onToolChange, onCanvasInteract, onMoveSelected, onMoveCommit, onUpdateActions, onUpdateCommit, onSyncActions, onActionsChanged, clientId = 'self' },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const zoomRef = useRef(1);
  const [zoom, setZoomState] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const drawDataRef = useRef<{ points: { x: number; y: number }[]; currentColor: string; currentFillColor: string; currentStrokeWidth: number; currentOpacity: number; currentBrushStyle: string }>({
    points: [], currentColor: color, currentFillColor: fillColor, currentStrokeWidth: strokeWidth, currentOpacity: opacity, currentBrushStyle: brushStyle,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const eraserDeletedIdsRef = useRef<string[]>([]);
  // Eraser visual path
  const [eraserPath, setEraserPath] = useState<{ x: number; y: number }[]>([]);
  const [isErasing, setIsErasing] = useState(false);
  // Select drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  // Resize handle state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; bbox: { x: number; y: number; w: number; h: number } } | null>(null);
  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState<{ x: number; y: number; centerX: number; centerY: number; startAngle: number } | null>(null);
  const [groupRotation, setGroupRotation] = useState(0); // multi-select visual rotation during drag
  const origPointsRef = useRef<Map<string, {x:number;y:number}[]>>(new Map()); // original points before multi-rotate
  const prevAngleRef = useRef(0); // previous angle for incremental rotation
  const accumulatedRotRef = useRef(0); // total rotation accumulated since drag start
  const resizeOldPointsRef = useRef<Map<string, {x:number;y:number}[]>>(new Map());
  // Lasso fill state
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  // Inspect mode state
  const [inspectInfo, setInspectInfo] = useState<{ action: DrawAction; screenX: number; screenY: number } | null>(null);

  // Zoom
  const setZoomFn = useCallback((zOrFn: number | ((prev: number) => number)) => {
    setZoomState(prev => {
      const newZ = typeof zOrFn === 'function' ? zOrFn(prev) : zOrFn;
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZ));
      zoomRef.current = clamped;
      return clamped;
    });
  }, []);

  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (actions.length === 0) { zoomRef.current = 1; setZoomState(1); setPan({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const action of actions) { const bbox = getActionBBox(action); if (!bbox) continue; minX = Math.min(minX, bbox.x); minY = Math.min(minY, bbox.y); maxX = Math.max(maxX, bbox.x + bbox.w); maxY = Math.max(maxY, bbox.y + bbox.h); }
    if (!isFinite(minX)) return;
    const padding = 80;
    const contentW = maxX - minX + padding * 2; const contentH = maxY - minY + padding * 2;
    const canvasW = canvas.clientWidth; const canvasH = canvas.clientHeight;
    const newZoom = Math.min(canvasW / contentW, canvasH / contentH, 10);
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    zoomRef.current = clamped; setZoomState(clamped);
    setPan({ x: canvasW / 2 - (minX + maxX) / 2 * clamped, y: canvasH / 2 - (minY + maxY) / 2 * clamped });
  }, [actions]);

  const resetZoom = useCallback(() => { zoomRef.current = 1; setZoomState(1); }, []);

  const exportFullCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const action of actions) { const bbox = getActionBBox(action); if (!bbox) continue; minX = Math.min(minX, bbox.x); minY = Math.min(minY, bbox.y); maxX = Math.max(maxX, bbox.x + bbox.w); maxY = Math.max(maxY, bbox.y + bbox.h); }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
    const padding = 50; const exportW = maxX - minX + padding * 2; const exportH = maxY - minY + padding * 2;
    // Adaptive scale: cap total pixels to avoid memory crash (max ~16MP)
    const MAX_PIXELS = 16000000;
    let scale = 2;
    if (exportW * exportH * scale * scale > MAX_PIXELS) {
      scale = Math.sqrt(MAX_PIXELS / (exportW * exportH));
    }
    // Also cap absolute dimensions
    const MAX_DIM = 8000;
    if (exportW * scale > MAX_DIM || exportH * scale > MAX_DIM) {
      scale = Math.min(MAX_DIM / exportW, MAX_DIM / exportH);
    }
    const offscreen = document.createElement('canvas'); offscreen.width = Math.round(exportW * scale); offscreen.height = Math.round(exportH * scale);
    const offCtx = offscreen.getContext('2d'); if (!offCtx) return;
    offCtx.scale(scale, scale); offCtx.fillStyle = '#ffffff'; offCtx.fillRect(0, 0, exportW, exportH);
    offCtx.translate(-minX + padding, -minY + padding);
    drawAllActions(offCtx, actions, layers, 1);
    offscreen.toBlob((blob) => {
      if (!blob || blob.size === 0) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.download = `tahta-${Date.now()}.png`; link.href = url;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [actions, layers]);

  useImperativeHandle(ref, () => ({
    setZoom: (z: number) => { const c = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)); zoomRef.current = c; setZoomState(c); },
    getZoom: () => zoomRef.current, fitToScreen, resetZoom, exportFullCanvas,
    deleteSelected: () => { for (const id of selectedIds) { onDeleteAction?.(id); } setSelectedIds([]); },
    getSelectedIds: () => selectedIds,
    moveSelected: (dx: number, dy: number) => { onMoveSelected?.(dx, dy); },
  }), [fitToScreen, resetZoom, exportFullCanvas, selectedIds, onDeleteAction, onMoveSelected]);

  // Canvas coordinate conversion
  const getCanvasPoint = useCallback((e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    else if ('changedTouches' in e && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
    else { clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY; }
    const z = zoomRef.current;
    return { x: (clientX - rect.left - pan.x) / z, y: (clientY - rect.top - pan.y) / z };
  }, [pan]);

  // ===== DRAW ALL ACTIONS =====
  const drawAllActions = useCallback((ctx: CanvasRenderingContext2D, acts: DrawAction[], lrs: Layer[], _z: number) => {
    for (const action of acts) {
      const layer = lrs.find(l => l.id === action.layerId);
      if (!layer || !layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = action.opacity * (layer.opacity ?? 1);
      // Apply individual rotation if set
      if (action.rotation) {
        const bbox = getActionBBox(action);
        if (bbox) {
          const cx = bbox.x + bbox.w / 2;
          const cy = bbox.y + bbox.h / 2;
          ctx.translate(cx, cy);
          ctx.rotate((action.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
      }
      switch (action.type) {
        case 'pen': case 'freehand':
          drawWithBrushStyle(ctx, action.points, action.color, action.strokeWidth, action.opacity, action.brushStyle || 'marker');
          break;
        case 'line':
          if (action.points.length < 2) break;
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(action.points[0].x, action.points[0].y); ctx.lineTo(action.points[1].x, action.points[1].y); ctx.stroke();
          break;
        case 'arrow': {
          if (action.points.length < 2) break;
          const [p0, p1] = [action.points[0], action.points[1]];
          const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
          const headLen = Math.max(action.strokeWidth * 3, 14);
          ctx.strokeStyle = action.color;
          ctx.fillStyle = action.color;
          ctx.lineWidth = action.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Line stops where triangle base starts (not going through it)
          const baseX = p1.x - headLen * Math.cos(angle);
          const baseY = p1.y - headLen * Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(baseX, baseY);
          ctx.stroke();
          // Triangle head: tip at p1, base behind it
          const perpX = Math.sin(angle) * headLen * 0.55;
          const perpY = -Math.cos(angle) * headLen * 0.55;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(baseX + perpX, baseY + perpY);
          ctx.lineTo(baseX - perpX, baseY - perpY);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'rectangle': {
          if (action.points.length < 2) break;
          const rx = Math.min(action.points[0].x, action.points[1].x), ry = Math.min(action.points[0].y, action.points[1].y), rw = Math.abs(action.points[1].x - action.points[0].x), rh = Math.abs(action.points[1].y - action.points[0].y);
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fillRect(rx, ry, rw, rh); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.strokeRect(rx, ry, rw, rh);
          break;
        }
        case 'square': {
          if (action.points.length < 2) break;
          const side = Math.min(Math.abs(action.points[1].x - action.points[0].x), Math.abs(action.points[1].y - action.points[0].y));
          const sx = action.points[1].x > action.points[0].x ? action.points[0].x : action.points[0].x - side;
          const sy = action.points[1].y > action.points[0].y ? action.points[0].y : action.points[0].y - side;
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fillRect(sx, sy, side, side); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.strokeRect(sx, sy, side, side);
          break;
        }
        case 'ellipse': {
          if (action.points.length < 2) break;
          const ecx = (action.points[0].x + action.points[1].x) / 2, ecy = (action.points[0].y + action.points[1].y) / 2;
          const erx = Math.abs(action.points[1].x - action.points[0].x) / 2, ery = Math.abs(action.points[1].y - action.points[0].y) / 2;
          ctx.beginPath(); ctx.ellipse(ecx, ecy, erx || 1, ery || 1, 0, 0, Math.PI * 2);
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fill(); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.stroke();
          break;
        }
        case 'circle': {
          if (action.points.length < 2) break;
          const ccx = (action.points[0].x + action.points[1].x) / 2, ccy = (action.points[0].y + action.points[1].y) / 2;
          const cr = Math.min(Math.abs(action.points[1].x - action.points[0].x), Math.abs(action.points[1].y - action.points[0].y)) / 2;
          ctx.beginPath(); ctx.arc(ccx, ccy, cr || 1, 0, Math.PI * 2);
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fill(); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.stroke();
          break;
        }
        case 'triangle': {
          if (action.points.length < 2) break;
          const ttx = Math.min(action.points[0].x, action.points[1].x), tty = Math.min(action.points[0].y, action.points[1].y);
          const tw = Math.abs(action.points[1].x - action.points[0].x), th = Math.abs(action.points[1].y - action.points[0].y);
          ctx.beginPath(); ctx.moveTo(ttx + tw / 2, tty); ctx.lineTo(ttx + tw, tty + th); ctx.lineTo(ttx, tty + th); ctx.closePath();
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fill(); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.stroke();
          break;
        }
        case 'star': {
          if (action.points.length < 2) break;
          const scx = (action.points[0].x + action.points[1].x) / 2, scy = (action.points[0].y + action.points[1].y) / 2;
          const outerR = Math.min(Math.abs(action.points[1].x - action.points[0].x), Math.abs(action.points[1].y - action.points[0].y)) / 2; const innerR = outerR * 0.4;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? outerR : innerR; const a = (Math.PI * 2 * i) / 10 - Math.PI / 2; if (i === 0) ctx.moveTo(scx + r * Math.cos(a), scy + r * Math.sin(a)); else ctx.lineTo(scx + r * Math.cos(a), scy + r * Math.sin(a)); }
          ctx.closePath();
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fill(); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.stroke();
          break;
        }
        case 'diamond': {
          if (action.points.length < 2) break;
          const dcx = (action.points[0].x + action.points[1].x) / 2, dcy = (action.points[0].y + action.points[1].y) / 2;
          const dw = Math.abs(action.points[1].x - action.points[0].x) / 2, dh = Math.abs(action.points[1].y - action.points[0].y) / 2;
          ctx.beginPath(); ctx.moveTo(dcx, dcy - dh); ctx.lineTo(dcx + dw, dcy); ctx.lineTo(dcx, dcy + dh); ctx.lineTo(dcx - dw, dcy); ctx.closePath();
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fill(); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.stroke();
          break;
        }
        case 'speech': {
          if (action.points.length < 2) break;
          const spx = Math.min(action.points[0].x, action.points[1].x), spy = Math.min(action.points[0].y, action.points[1].y);
          const spw = Math.abs(action.points[1].x - action.points[0].x), sph = Math.abs(action.points[1].y - action.points[0].y);
          const r = Math.min(spw, sph) * 0.15;
          ctx.beginPath(); ctx.moveTo(spx + r, spy); ctx.lineTo(spx + spw - r, spy); ctx.arcTo(spx + spw, spy, spx + spw, spy + r, r);
          ctx.lineTo(spx + spw, spy + sph - r); ctx.arcTo(spx + spw, spy + sph, spx + spw - r, spy + sph, r);
          ctx.lineTo(spx + spw * 0.4, spy + sph); ctx.lineTo(spx + spw * 0.25, spy + sph + sph * 0.3); ctx.lineTo(spx + spw * 0.35, spy + sph);
          ctx.lineTo(spx + r, spy + sph); ctx.arcTo(spx, spy + sph, spx, spy + sph - r, r);
          ctx.lineTo(spx, spy + r); ctx.arcTo(spx, spy, spx + r, spy, r); ctx.closePath();
          if (action.fillColor && action.fillColor !== 'transparent') { ctx.fillStyle = action.fillColor; ctx.fill(); }
          ctx.strokeStyle = action.color; ctx.lineWidth = action.strokeWidth; ctx.stroke();
          break;
        }
        case 'text': {
          ctx.fillStyle = action.color;
          const fw = action.fontWeight || 'normal'; const fs = action.fontStyle || 'normal';
          ctx.font = `${fs} ${fw} ${action.fontSize || 16}px ${action.fontFamily || 'Arial'}`; ctx.textBaseline = 'top';
          (action.text || '').split('\n').forEach((line, i) => { ctx.fillText(line, action.points[0].x, action.points[0].y + i * (action.fontSize || 16) * 1.2); });
          break;
        }
        case 'image': {
          if (action.imageSrc) {
            const cachedImg = getCachedImage(action.imageSrc);
            if (cachedImg) {
              ctx.drawImage(cachedImg, action.points[0].x, action.points[0].y, action.imageWidth || cachedImg.naturalWidth, action.imageHeight || cachedImg.naturalHeight);
            } else {
              // Image not loaded yet — it will trigger redraw when loaded
              const img = new Image(); img.src = action.imageSrc;
              img.onload = () => { imageCache.set(action.imageSrc!, img); redraw(); };
            }
          }
          break;
        }
        case 'fillbucket': {
          if (action.fillBitmap && action.fillBitmapOrigin) {
            const img = new Image();
            img.src = action.fillBitmap;
            if (img.complete) {
              ctx.drawImage(img, action.fillBitmapOrigin.x, action.fillBitmapOrigin.y);
            } else {
              img.onload = () => { redraw(); };
            }
          }
          break;
        }
        case 'lasso': {
          if (action.fillBitmap && action.fillBitmapOrigin) {
            const img = new Image();
            img.src = action.fillBitmap;
            if (img.complete) {
              ctx.drawImage(img, action.fillBitmapOrigin.x, action.fillBitmapOrigin.y);
            } else {
              img.onload = () => { redraw(); };
            }
          }
          break;
        }
      }
      ctx.restore();
    }
  }, [selectedIds, groupRotation, actions]);

  // Store globally for bitmap generation
  useEffect(() => { drawAllActionsGlobal = drawAllActions; }, [drawAllActions]);

  // ===== MAIN REDRAW =====
  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const z = zoomRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    if (settings.background === 'black') ctx.fillStyle = '#1a1a1a'; else if (settings.background === 'gray') ctx.fillStyle = '#f3f4f6'; else ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(z, z);
    if (settings.showGrid) {
      const gridSize = getAdaptiveGridSize(z);
      ctx.strokeStyle = z > 0.3 ? '#e5e7eb' : '#d1d5db'; ctx.lineWidth = 0.5 / z;
      const viewLeft = -pan.x / z, viewTop = -pan.y / z, viewRight = viewLeft + canvas.clientWidth / z, viewBottom = viewTop + canvas.clientHeight / z;
      const startX = Math.floor(viewLeft / gridSize) * gridSize, startY = Math.floor(viewTop / gridSize) * gridSize;
      ctx.beginPath();
      for (let x = startX; x <= viewRight; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, viewBottom); }
      for (let y = startY; y <= viewBottom; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(viewRight, y); }
      ctx.stroke();
    }
    if (settings.background === 'dots') {
      const gridSize = 20; const viewLeft = -pan.x / z, viewTop = -pan.y / z, viewRight = viewLeft + canvas.clientWidth / z, viewBottom = viewTop + canvas.clientHeight / z;
      const startX = Math.floor(viewLeft / gridSize) * gridSize, startY = Math.floor(viewTop / gridSize) * gridSize;
      ctx.fillStyle = '#d1d5db';
      for (let x = startX; x <= viewRight; x += gridSize) { for (let y = startY; y <= viewBottom; y += gridSize) { ctx.beginPath(); ctx.arc(x, y, 1 / z, 0, Math.PI * 2); ctx.fill(); } }
    }
    drawAllActions(ctx, actions, layers, z);    // Selection highlights with unified bounding box + handles
    if (selectedIds.length > 0) {
      const ub = getUnifiedBBox(actions, selectedIds);
      if (ub) {
        ctx.save();
        const handleR = 5 / z;
        const pad = 4;
        const uc = { x: ub.x + ub.w / 2, y: ub.y + ub.h / 2 };
        // Draw unified bbox
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]);
        ctx.strokeRect(ub.x - pad, ub.y - pad, ub.w + pad * 2, ub.h + pad * 2);
        ctx.setLineDash([]);
        // Corner resize handles
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2 / z;
        const corners: [number, number][] = [
          [ub.x - pad, ub.y - pad], [ub.x + ub.w + pad, ub.y - pad],
          [ub.x - pad, ub.y + ub.h + pad], [ub.x + ub.w + pad, ub.y + ub.h + pad],
        ];
        for (const [cx, cy] of corners) {
          ctx.beginPath(); ctx.arc(cx, cy, handleR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        // Rotation handle: circle above center top
        const rotHX = ub.x + ub.w / 2;
        const rotHY = ub.y - pad - 20;
        ctx.fillStyle = '#2563eb';
        ctx.beginPath(); ctx.arc(rotHX, rotHY, handleR * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(rotHX, rotHY, handleR * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Connecting line
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1 / z; ctx.setLineDash([3 / z, 3 / z]);
        ctx.beginPath();
        ctx.moveTo(ub.x + ub.w / 2, ub.y - pad);
        ctx.lineTo(rotHX, rotHY + handleR * 1.2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
    if (selectionBox) {
      ctx.save(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([6 / z, 4 / z]);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)'; ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h); ctx.setLineDash([]); ctx.restore();
    }
    if (settings.showCursors) {
      participants.forEach(p => {
        if (p.cursorPosition && p.id !== 'self') {
          const sx = p.cursorPosition.x * z + pan.x, sy = p.cursorPosition.y * z + pan.y;
          ctx.save(); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
          ctx.font = '11px system-ui'; ctx.fillText(p.name, sx + 8, sy - 4); ctx.restore();
        }
      });
    }
    ctx.restore();
  }, [actions, layers, zoom, pan, settings, participants, selectedIds, selectionBox, groupRotation, drawAllActions]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { const h = () => redraw(); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, [redraw]);

  // ===== POINTER HANDLERS =====
  const handlePointerDown = (e: React.PointerEvent) => {
    // NEVER trigger drawing from middle mouse button, while panning, or during multi-touch
    if (e.button === 1 || middleButtonRef.current || isPanningRef.current || isMultiTouchRef.current) return;
    if (tool === 'hand') { setIsPanning(true); isPanningRef.current = true; setLastPanPos({ x: e.clientX, y: e.clientY }); return; }

    // SELECT
    if (tool === 'select') {
      const pt = getCanvasPoint(e);
      onCanvasInteract?.();

      // Check if clicking a resize or rotation handle on the UNIFIED bbox
      if (selectedIds.length > 0) {
        const ub = getUnifiedBBox(actions, selectedIds);
        if (ub) {
          const handleR = 8 / zoomRef.current;
          // Compute average rotation
          let avgRot = 0;
          let rotCount = 0;
          for (const action of actions) {
            if (selectedIds.includes(action.id) && action.rotation) { avgRot += action.rotation; rotCount++; }
          }
          if (rotCount > 0) avgRot /= rotCount;
          const uc = { x: ub.x + ub.w / 2, y: ub.y + ub.h / 2 };
          // Transform click point into unrotated space for handle detection
          const rpt = avgRot ? rotatePoint(pt, uc, -avgRot) : pt;
          // Rotation handle: circle above center top (in unrotated space)
          const rotX = ub.x + ub.w / 2;
          const rotY = ub.y - 24;
          if (Math.hypot(rpt.x - rotX, rpt.y - rotY) < handleR * 1.5) {
            const startRot = avgRot;
            // Save original points for multi-select rotation
            const origMap = new Map<string, {x:number;y:number}[]>();
            for (const a of actions) {
              if (selectedIds.includes(a.id)) origMap.set(a.id, a.points.map(p => ({...p})));
            }
            origPointsRef.current = origMap;
            const initAngle = Math.atan2(pt.y - uc.y, pt.x - uc.x);
            prevAngleRef.current = initAngle;
            accumulatedRotRef.current = startRot;
            setIsRotating(true);
            setRotateStart({ x: pt.x, y: pt.y, centerX: uc.x, centerY: uc.y, startAngle: startRot });
            return;
          }
          // Corner resize handles
          const corners: [string, number, number][] = [
            ['tl', ub.x - 4, ub.y - 4],
            ['tr', ub.x + ub.w + 4, ub.y - 4],
            ['bl', ub.x - 4, ub.y + ub.h + 4],
            ['br', ub.x + ub.w + 4, ub.y + ub.h + 4],
          ];
          for (const [name, cx, cy] of corners) {
            if (Math.hypot(rpt.x - cx, rpt.y - cy) < handleR) {
              // Save old points for undo
              const oldPts = new Map<string, {x:number;y:number}[]>();
              for (const a of actions) { if (selectedIds.includes(a.id)) oldPts.set(a.id, a.points.map(p => ({...p}))); }
              resizeOldPointsRef.current = oldPts;
              setIsResizing(true);
              setResizeHandle(name);
              setResizeStart({ x: pt.x, y: pt.y, bbox: ub });
              return;
            }
          }
        }
      }

      // Check if clicking inside the unified bbox of selected items (drag all)
      let found: DrawAction | null = null;
      if (selectedIds.length > 0) {
        const ub = getUnifiedBBox(actions, selectedIds);
        if (ub && pt.x >= ub.x && pt.x <= ub.x + ub.w && pt.y >= ub.y && pt.y <= ub.y + ub.h) {
          // Click inside unified bbox — drag all selected
          found = actions.find(a => selectedIds.includes(a.id)) || null;
        }
      }
      // If not clicking selected objects, check all objects
      if (!found) {
        for (let i = actions.length - 1; i >= 0; i--) { if (isPointInAction(pt, actions[i])) { found = actions[i]; break; } }
      }
      if (found) {
        if (e.shiftKey || e.ctrlKey) {
          // Toggle selection
          setSelectedIds(prev => prev.includes(found!.id) ? prev.filter(id => id !== found!.id) : [...prev, found!.id]);
        } else if (selectedIds.includes(found.id)) {
          // Already selected — keep multi-selection, start drag
        } else {
          // New single selection
          setSelectedIds([found.id]);
        }
        // Start drag
        setIsDragging(true);
        setDragStart(pt);
      } else {
        setSelectedIds([]); setIsSelecting(true); setStartPoint(pt); setSelectionBox({ x: pt.x, y: pt.y, w: 0, h: 0 });
      }
      return;
    }

    // INSPECT — click to see who drew what
    if (tool === 'inspect') {
      const pt = getCanvasPoint(e);
      onCanvasInteract?.();
      let found: DrawAction | null = null;
      for (let i = actions.length - 1; i >= 0; i--) {
        if (isPointInAction(pt, actions[i])) { found = actions[i]; break; }
      }
      if (found) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const screenX = rect ? rect.left + pt.x * zoomRef.current + pan.x : 0;
        const screenY = rect ? rect.top + pt.y * zoomRef.current + pan.y : 0;
        setInspectInfo({ action: found, screenX, screenY });
      } else {
        setInspectInfo(null);
      }
      return;
    }

    // ERASER — start erasing with visual path
    if (tool === 'eraser') {
      const pt = getCanvasPoint(e);
      onCanvasInteract?.();
      setIsErasing(true);
      setEraserPath([pt]);
      eraserDeletedIdsRef.current = [];
      // Immediately delete object at click point
      for (let i = actions.length - 1; i >= 0; i--) {
        if (isPointInAction(pt, actions[i])) {
          onDeleteAction?.(actions[i].id);
          eraserDeletedIdsRef.current.push(actions[i].id);
          break;
        }
      }
      return;
    }

    if (tool === 'image') { handleImageClick(e); return; }

    const pt = getCanvasPoint(e); onCanvasInteract?.(); setIsDrawing(true); setStartPoint(pt);
    drawDataRef.current = { points: [pt], currentColor: color, currentFillColor: fillColor, currentStrokeWidth: strokeWidth, currentOpacity: opacity, currentBrushStyle: brushStyle };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) { const dx = e.clientX - lastPanPos.x, dy = e.clientY - lastPanPos.y; setPan(p => ({ x: p.x + dx, y: p.y + dy })); setLastPanPos({ x: e.clientX, y: e.clientY }); return; }
    const pt = getCanvasPoint(e);

    // SELECT: rotate via rotation handle
    if (tool === 'select' && isRotating && rotateStart) {
      const currentAngle = Math.atan2(pt.y - rotateStart.centerY, pt.x - rotateStart.centerX);
      const prevAngle = prevAngleRef.current;
      let deltaRad = currentAngle - prevAngle;
      if (deltaRad > Math.PI) deltaRad -= 2 * Math.PI;
      if (deltaRad < -Math.PI) deltaRad += 2 * Math.PI;
      const deltaDeg = (deltaRad * 180) / Math.PI;
      prevAngleRef.current = currentAngle;
      // Birikimli toplam açıyı güncelle
      accumulatedRotRef.current += deltaDeg;
      const totalDeg = accumulatedRotRef.current;
      // Tekli ve çoklu seçimde hepsini points ile döndür (rotation field kullanma)
      const center = { x: rotateStart.centerX, y: rotateStart.centerY };
      const origMap = origPointsRef.current;
      onUpdateActions?.(prev => prev.map(a => {
        if (!selectedIds.includes(a.id)) return a;
        const origPts = origMap.get(a.id);
        if (!origPts) return a;
        return { ...a, points: origPts.map(p => rotatePoint(p, center, totalDeg)), rotation: 0 };
      }));
      return;
    }

    // SELECT: resize via handles
    if (tool === 'select' && isResizing && resizeStart && resizeHandle) {
      const dx = pt.x - resizeStart.x;
      const dy = pt.y - resizeStart.y;
      const ob = resizeStart.bbox;
      let newBbox = { ...ob };
      if (resizeHandle.includes('r')) newBbox.w = Math.max(10, ob.w + dx);
      if (resizeHandle.includes('l')) { newBbox.x = ob.x + dx; newBbox.w = Math.max(10, ob.w - dx); }
      if (resizeHandle.includes('b')) newBbox.h = Math.max(10, ob.h + dy);
      if (resizeHandle.includes('t')) { newBbox.y = ob.y + dy; newBbox.h = Math.max(10, ob.h - dy); }
      // Scale all selected actions proportionally
      const sx = newBbox.w / Math.max(ob.w, 1);
      const sy = newBbox.h / Math.max(ob.h, 1);
      onUpdateActions?.(prev => prev.map(a => {
        if (!selectedIds.includes(a.id)) return a;
        const ab = getActionBBox(a);
        if (!ab) return a;
        // Relative position within combined bbox
        const relX = (ab.x - ob.x) / Math.max(ob.w, 1);
        const relY = (ab.y - ob.y) / Math.max(ob.h, 1);
        // New position of this action's bbox within the resized combined bbox
        const newAbX = newBbox.x + relX * newBbox.w;
        const newAbY = newBbox.y + relY * newBbox.h;
        const newAbW = Math.max(ab.w * sx, 1);
        const newAbH = Math.max(ab.h * sy, 1);
        // Scale each point relative to its own bbox, then translate to new position
        return {
          ...a,
          points: a.points.map(p => {
            const pRelX = (p.x - ab.x) / Math.max(ab.w, 1);
            const pRelY = (p.y - ab.y) / Math.max(ab.h, 1);
            return { x: newAbX + pRelX * newAbW, y: newAbY + pRelY * newAbH };
          }),
          strokeWidth: Math.max(1, a.strokeWidth * Math.min(sx, sy)),
          imageWidth: a.imageWidth ? Math.max(10, Math.round(a.imageWidth * sx)) : undefined,
          imageHeight: a.imageHeight ? Math.max(10, Math.round(a.imageHeight * sy)) : undefined,
        };
      }));
      setResizeStart({ x: pt.x, y: pt.y, bbox: newBbox });
      return;
    }

    // SELECT: drag selected objects
    if (tool === 'select' && isDragging && dragStart) {
      const dx = pt.x - dragStart.x, dy = pt.y - dragStart.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        onMoveSelected?.(dx, dy);
        setDragStart(pt);
      }
      return;
    }

    if (isSelecting && startPoint) {
      setSelectionBox({ x: Math.min(startPoint.x, pt.x), y: Math.min(startPoint.y, pt.y), w: Math.abs(pt.x - startPoint.x), h: Math.abs(pt.y - startPoint.y) });
      return;
    }

    // ERASER: draw visible path and delete touched objects
    if (tool === 'eraser' && isErasing) {
      setEraserPath(prev => [...prev, pt]);
      // Delete objects touched by the eraser path
      const eraserRadius = Math.max(strokeWidth * 2, 15);
      for (let i = actions.length - 1; i >= 0; i--) {
        if (eraserDeletedIdsRef.current.includes(actions[i].id)) continue;
        if (isPointInAction(pt, actions[i])) {
          onDeleteAction?.(actions[i].id);
          eraserDeletedIdsRef.current.push(actions[i].id);
        }
      }
      // Also redraw to show the eraser line
      redraw();
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoomRef.current, zoomRef.current);
      // Draw eraser path as a visible red dashed line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = eraserRadius;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.5;
      if (eraserPath.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(eraserPath[0].x, eraserPath[0].y);
        for (let i = 1; i < eraserPath.length; i++) {
          ctx.lineTo(eraserPath[i].x, eraserPath[i].y);
        }
        ctx.stroke();
      }
      // Draw eraser circle at current position
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fecaca';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 / zoomRef.current;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, eraserRadius / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (!isDrawing || tool === 'hand' || tool === 'select' || tool === 'eraser') return;

    // PEN / FREEHAND live preview
    if (tool === 'pen' || tool === 'freehand') {
      drawDataRef.current.points.push(pt);
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoomRef.current, zoomRef.current);
      const pts = drawDataRef.current.points;
      if (pts.length >= 2) {
        const last2 = [pts[pts.length - 2], pts[pts.length - 1]];
        drawWithBrushStyle(ctx, last2, drawDataRef.current.currentColor, drawDataRef.current.currentStrokeWidth, drawDataRef.current.currentOpacity, drawDataRef.current.currentBrushStyle);
      }
      ctx.restore();
    } else if (startPoint) {
      // Shape live preview
      redraw();
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoomRef.current, zoomRef.current);
      ctx.globalAlpha = opacity; ctx.lineWidth = strokeWidth; ctx.strokeStyle = color; ctx.fillStyle = fillColor; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      switch (tool) {
        case 'line': ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(pt.x, pt.y); ctx.stroke(); break;
        case 'arrow': { const angle2 = Math.atan2(pt.y - startPoint.y, pt.x - startPoint.x); const headLen2 = Math.max(strokeWidth * 3, 14); const baseX2 = pt.x - headLen2 * Math.cos(angle2), baseY2 = pt.y - headLen2 * Math.sin(angle2); ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(baseX2, baseY2); ctx.stroke(); ctx.fillStyle = color; const perpX2 = Math.sin(angle2) * headLen2 * 0.55, perpY2 = -Math.cos(angle2) * headLen2 * 0.55; ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(baseX2 + perpX2, baseY2 + perpY2); ctx.lineTo(baseX2 - perpX2, baseY2 - perpY2); ctx.closePath(); ctx.fill(); break; }
        case 'rectangle': if (fillColor !== 'transparent') ctx.fillRect(Math.min(startPoint.x, pt.x), Math.min(startPoint.y, pt.y), Math.abs(pt.x - startPoint.x), Math.abs(pt.y - startPoint.y)); ctx.strokeRect(Math.min(startPoint.x, pt.x), Math.min(startPoint.y, pt.y), Math.abs(pt.x - startPoint.x), Math.abs(pt.y - startPoint.y)); break;
        case 'square': { const side = Math.min(Math.abs(pt.x - startPoint.x), Math.abs(pt.y - startPoint.y)); const sx = pt.x > startPoint.x ? startPoint.x : startPoint.x - side; const sy = pt.y > startPoint.y ? startPoint.y : startPoint.y - side; if (fillColor !== 'transparent') ctx.fillRect(sx, sy, side, side); ctx.strokeRect(sx, sy, side, side); break; }
        case 'ellipse': ctx.beginPath(); ctx.ellipse((startPoint.x + pt.x) / 2, (startPoint.y + pt.y) / 2, Math.abs(pt.x - startPoint.x) / 2 || 1, Math.abs(pt.y - startPoint.y) / 2 || 1, 0, 0, Math.PI * 2); if (fillColor !== 'transparent') ctx.fill(); ctx.stroke(); break;
        case 'circle': { const r = Math.min(Math.abs(pt.x - startPoint.x), Math.abs(pt.y - startPoint.y)) / 2; ctx.beginPath(); ctx.arc((startPoint.x + pt.x) / 2, (startPoint.y + pt.y) / 2, r || 1, 0, Math.PI * 2); if (fillColor !== 'transparent') ctx.fill(); ctx.stroke(); break; }
        case 'triangle': { const tw = Math.abs(pt.x - startPoint.x), th = Math.abs(pt.y - startPoint.y), ttx = Math.min(startPoint.x, pt.x), tty = Math.min(startPoint.y, pt.y); ctx.beginPath(); ctx.moveTo(ttx + tw / 2, tty); ctx.lineTo(ttx + tw, tty + th); ctx.lineTo(ttx, tty + th); ctx.closePath(); if (fillColor !== 'transparent') ctx.fill(); ctx.stroke(); break; }
        case 'star': { const scx = (startPoint.x + pt.x) / 2, scy = (startPoint.y + pt.y) / 2; const outerR = Math.min(Math.abs(pt.x - startPoint.x), Math.abs(pt.y - startPoint.y)) / 2; const innerR = outerR * 0.4; ctx.beginPath(); for (let i = 0; i < 10; i++) { const sr = i % 2 === 0 ? outerR : innerR; const sa = (Math.PI * 2 * i) / 10 - Math.PI / 2; if (i === 0) ctx.moveTo(scx + sr * Math.cos(sa), scy + sr * Math.sin(sa)); else ctx.lineTo(scx + sr * Math.cos(sa), scy + sr * Math.sin(sa)); } ctx.closePath(); if (fillColor !== 'transparent') ctx.fill(); ctx.stroke(); break; }
        case 'diamond': { const dcx = (startPoint.x + pt.x) / 2, dcy = (startPoint.y + pt.y) / 2; const dw = Math.abs(pt.x - startPoint.x) / 2, dh = Math.abs(pt.y - startPoint.y) / 2; ctx.beginPath(); ctx.moveTo(dcx, dcy - dh); ctx.lineTo(dcx + dw, dcy); ctx.lineTo(dcx, dcy + dh); ctx.lineTo(dcx - dw, dcy); ctx.closePath(); if (fillColor !== 'transparent') ctx.fill(); ctx.stroke(); break; }
        case 'speech': { const spx = Math.min(startPoint.x, pt.x), spy = Math.min(startPoint.y, pt.y); const spw = Math.abs(pt.x - startPoint.x), sph = Math.abs(pt.y - startPoint.y); const r = Math.min(spw, sph) * 0.15; ctx.beginPath(); ctx.moveTo(spx + r, spy); ctx.lineTo(spx + spw - r, spy); ctx.arcTo(spx + spw, spy, spx + spw, spy + r, r); ctx.lineTo(spx + spw, spy + sph - r); ctx.arcTo(spx + spw, spy + sph, spx + spw - r, spy + sph, r); ctx.lineTo(spx + spw * 0.4, spy + sph); ctx.lineTo(spx + spw * 0.25, spy + sph + sph * 0.3); ctx.lineTo(spx + spw * 0.35, spy + sph); ctx.lineTo(spx + r, spy + sph); ctx.arcTo(spx, spy + sph, spx, spy + sph - r, r); ctx.lineTo(spx, spy + r); ctx.arcTo(spx, spy, spx + r, spy, r); ctx.closePath(); if (fillColor !== 'transparent') ctx.fill(); ctx.stroke(); break; }
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) { setIsPanning(false); isPanningRef.current = false; return; }

    // SELECT: end rotation — commit undo
    if (tool === 'select' && isRotating) {
      if (origPointsRef.current.size > 0) {
        onUpdateCommit?.(origPointsRef.current);
      }
      onActionsChanged?.(selectedIds);
      setIsRotating(false);
      setRotateStart(null);
      setGroupRotation(0);
      accumulatedRotRef.current = 0;
      origPointsRef.current = new Map();
      onSyncActions?.();
      return;
    }

    // SELECT: end resize — commit undo
    if (tool === 'select' && isResizing) {
      if (resizeOldPointsRef.current.size > 0) {
        onUpdateCommit?.(resizeOldPointsRef.current);
      }
      onActionsChanged?.(selectedIds);
      resizeOldPointsRef.current = new Map();
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
      onSyncActions?.();
      return;
    }

    // SELECT: end drag
    if (tool === 'select') {
      if (isDragging) { setIsDragging(false); setDragStart(null); onMoveCommit?.(); onActionsChanged?.(selectedIds); onSyncActions?.(); }
      if (isSelecting && selectionBox) {
        setIsSelecting(false);
        const selected: string[] = [];
        for (const action of actions) { const bbox = getActionBBox(action); if (bbox && boxesOverlap(selectionBox, bbox)) selected.push(action.id); }
        setSelectedIds(selected); setSelectionBox(null); setStartPoint(null);
      }
      return;
    }

    // ERASER: end erasing — clear visual path and redraw
    if (tool === 'eraser' && isErasing) {
      setIsErasing(false);
      setEraserPath([]);
      eraserDeletedIdsRef.current = [];
      redraw();
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    const pt = getCanvasPoint(e);

    if (tool === 'pen' || tool === 'freehand') {
      if (drawDataRef.current.points.length < 2) return;
      onAddAction({ id: generateId(), type: tool, points: [...drawDataRef.current.points], color: drawDataRef.current.currentColor, fillColor: drawDataRef.current.currentFillColor, strokeWidth: drawDataRef.current.currentStrokeWidth, opacity: drawDataRef.current.currentOpacity, layerId: activeLayerId, userId: clientId, timestamp: Date.now(), brushStyle: drawDataRef.current.currentBrushStyle });
    } else if (startPoint) {
      onAddAction({ id: generateId(), type: tool, points: [startPoint, pt], color, fillColor, strokeWidth, opacity, layerId: activeLayerId, userId: clientId, timestamp: Date.now(), fontSize, fontFamily, brushStyle });
    }
    setStartPoint(null); drawDataRef.current.points = [];
  };

  // Middle mouse button: pan only, never draw
  const middleButtonRef = useRef(false);
  const lastPointerButton = useRef<number>(0);
  const handleMouseDown = (e: React.MouseEvent) => { lastPointerButton.current = e.button; if (e.button === 1) { e.preventDefault(); middleButtonRef.current = true; isPanningRef.current = true; setIsPanning(true); setLastPanPos({ x: e.clientX, y: e.clientY }); } };
  const handleMouseUp = (e: React.MouseEvent) => { if (e.button === 1) { middleButtonRef.current = false; isPanningRef.current = false; setIsPanning(false); } };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const oldZ = zoomRef.current;
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 150);
    const zoomFactor = Math.pow(1.003, -normalizedDelta);
    const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * zoomFactor));
    const newPanX = mouseX - (mouseX - pan.x) * (newZ / oldZ);
    const newPanY = mouseY - (mouseY - pan.y) * (newZ / oldZ);
    zoomRef.current = newZ; setZoomState(newZ); setPan({ x: newPanX, y: newPanY });
  };

  const lastTouchDist = useRef<number | null>(null);
  const isMultiTouchRef = useRef(false);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      isMultiTouchRef.current = true;
      // Cancel any active drawing
      if (isDrawing) {
        setIsDrawing(false);
        setStartPoint(null);
        drawDataRef.current.points = [];
      }
      if (isErasing) {
        setIsErasing(false);
        setEraserPath([]);
      }
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      isMultiTouchRef.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy); const scale = newDist / lastTouchDist.current;
      const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect();
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left, centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const oldZ = zoomRef.current; const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * scale));
      const newPanX = centerX - (centerX - pan.x) * (newZ / oldZ), newPanY = centerY - (centerY - pan.y) * (newZ / oldZ);
      zoomRef.current = newZ; setZoomState(newZ); setPan({ x: newPanX, y: newPanY }); lastTouchDist.current = newDist;
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => { if (e.touches.length < 2) { lastTouchDist.current = null; isMultiTouchRef.current = false; } };

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'text') return;
    const pt = getCanvasPoint(e); const text = prompt('Metin girin:'); if (!text) return;
    onAddAction({ id: generateId(), type: 'text', points: [pt], color, fillColor: 'transparent', strokeWidth, opacity, layerId: activeLayerId, userId: clientId, timestamp: Date.now(), text, fontSize, fontFamily });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageClickPoint, setImageClickPoint] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const handleImageClick = (e: React.PointerEvent) => { if (tool !== 'image') return; setImageClickPoint(getCanvasPoint(e)); fileInputRef.current?.click(); };
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (ev) => {
      const img = new Image(); img.onload = () => {
        // Maintain aspect ratio, max 500px on longest side
        const maxDim = 500;
        let iw = img.width, ih = img.height;
        if (iw > maxDim || ih > maxDim) {
          const scale = maxDim / Math.max(iw, ih);
          iw = Math.round(iw * scale);
          ih = Math.round(ih * scale);
        }
        onAddAction({ id: generateId(), type: 'image', points: [imageClickPoint], color: 'transparent', fillColor: 'transparent', strokeWidth: 0, opacity, layerId: activeLayerId, userId: clientId, timestamp: Date.now(), imageSrc: ev.target?.result as string, imageWidth: iw, imageHeight: ih });
      }; img.src = ev.target?.result as string;
    }; reader.readAsDataURL(file); e.target.value = '';
  };

  const getCursor = () => {
    if (tool === 'hand') return isPanning ? 'grabbing' : 'grab';
    if (tool === 'select') return isDragging ? 'move' : isSelecting ? 'crosshair' : 'default';
    if (tool === 'eraser') return 'pointer';
    if (tool === 'text') return 'text';
    if (tool === 'image') return 'pointer';
    if (tool === 'fillbucket') return 'crosshair';
    if (tool === 'lasso') return 'crosshair';
    if (tool === 'inspect') return 'help';
    return 'crosshair';
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <canvas ref={canvasRef} className="w-full h-full touch-none" style={{ cursor: getCursor() }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onWheel={handleWheel} onDoubleClick={handleTextDoubleClick} />
      <div className="absolute bottom-4 left-4 flex items-center gap-1 z-10">
        <button onClick={() => setZoomFn(z => z * 0.5)} className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors text-lg font-bold" title="Uzaklaştır">−</button>
        <button onClick={resetZoom} className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 font-mono hover:bg-gray-50 transition-colors min-w-[80px] text-center font-semibold" title="Sıfırla (%100)">{formatZoom(zoom)}</button>
        <button onClick={() => setZoomFn(z => z * 2)} className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors text-lg font-bold" title="Yakınlaştır">+</button>
        <button onClick={fitToScreen} className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors text-sm" title="Ekrana Sığdır">⊡</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageFileChange} />
      {selectedIds.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium pl-3 pr-1 py-1 rounded-full shadow z-10 flex items-center gap-2">
          <span>{selectedIds.length} nesne seçili — sürükle → taşı</span>
          <button
            onClick={() => { for (const id of selectedIds) { onDeleteAction?.(id); } setSelectedIds([]); }}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors shrink-0"
            title="Seçili nesneleri sil"
          >🗑️</button>
        </div>
      )}
      {/* Inspect tooltip */}
      {inspectInfo && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 max-w-xs pointer-events-none"
          style={{ left: Math.min(inspectInfo.screenX + 16, window.innerWidth - 280), top: Math.max(inspectInfo.screenY - 80, 8) }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: participants.find(p => p.id === inspectInfo.action.userId)?.color || '#888' }} />
            <span className="text-sm font-semibold">{participants.find(p => p.id === inspectInfo.action.userId)?.name || inspectInfo.action.userId || 'Bilinmiyor'}</span>
          </div>
          <div className="text-[11px] text-gray-400">
            Tür: {inspectInfo.action.type} • {new Date(inspectInfo.action.timestamp).toLocaleString('tr-TR')}
          </div>
          <button
            onClick={() => setInspectInfo(null)}
            className="absolute top-1 right-2 text-gray-500 hover:text-white text-xs"
          >✕</button>
        </div>
      )}
    </div>
  );
});

export default WhiteboardCanvas;
