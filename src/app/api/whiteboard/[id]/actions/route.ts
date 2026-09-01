import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Tüm actions'ları getir (?since=timestamp ile yeni olanları)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get('since') || '0', 10);

    // Board'u oluştur eğer yoksa
    const stored = await whiteboardStore.getWhiteboard(id);
    if (!stored) {
      const defaultSettings = {
        allowDrawing: true, allowImageUpload: true, allowCopy: true,
        showCursors: true, boardType: 'public' as const, background: 'white', showGrid: false,
      };
      await whiteboardStore.createWhiteboard(id, 'Tahta', defaultSettings, 'anonymous');
    }

    const { actions, deletedIds } = await whiteboardStore.getActions(id, since);
    return NextResponse.json({ actions, deletedIds, total: actions.length });
  } catch {
    return NextResponse.json({ error: 'İşlemler yüklenemedi.' }, { status: 500 });
  }
}

// Yeni action ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Board'u oluştur eğer yoksa
    const stored = await whiteboardStore.getWhiteboard(id);
    if (!stored) {
      const defaultSettings = {
        allowDrawing: true, allowImageUpload: true, allowCopy: true,
        showCursors: true, boardType: 'public' as const, background: 'white', showGrid: false,
      };
      await whiteboardStore.createWhiteboard(id, 'Tahta', defaultSettings, 'anonymous');
    }

    // Bulk update: replace all actions (for move/resize sync)
    if (body.bulk && Array.isArray(body.bulk)) {
      await whiteboardStore.setActions(id, body.bulk);
    } else {
      await whiteboardStore.addAction(id, body);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'İşlem eklenemedi.' }, { status: 500 });
  }
}
