import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';
import { generateId } from '@/lib/utils';

// Tahta oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, settings } = body;

    const id = generateId();
    const ownerId = 'user-' + generateId();

    const whiteboard = await whiteboardStore.createWhiteboard(id, name || 'Yeni Tahta', settings || {}, ownerId);
    return NextResponse.json(whiteboard);
  } catch {
    return NextResponse.json(
      { error: 'Tahta oluşturulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// Tahta getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Tahta ID gerekli.' }, { status: 400 });
    }

    const stored = await whiteboardStore.getWhiteboard(id);
    if (!stored) {
      const defaultSettings = { allowDrawing: true, allowImageUpload: true, allowCopy: true, showCursors: true, boardType: 'public' as const, background: 'white', showGrid: false };
      const whiteboard = await whiteboardStore.createWhiteboard(id, 'Tahta', defaultSettings, 'anonymous');
      return NextResponse.json(whiteboard);
    }

    return NextResponse.json(stored.whiteboard);
  } catch {
    return NextResponse.json({ error: 'Tahta yüklenirken bir hata oluştu.' }, { status: 500 });
  }
}
