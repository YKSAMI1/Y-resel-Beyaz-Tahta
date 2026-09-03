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

    const loadImages = searchParams.get('images') === 'true';
    const { actions, deletedIds } = await whiteboardStore.getActions(id, since, loadImages);
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

    // Bulk upsert: mevcut action'lari silmeden sadece verilenleri ekle/guncelle
    if (body.bulk && Array.isArray(body.bulk)) {
      await whiteboardStore.upsertActions(id, body.bulk);
    } else if (body.upsert && Array.isArray(body.upsert)) {
      // Hedefli upsert: sadece degisen action'lari gonder
      await whiteboardStore.upsertActions(id, body.upsert);
    } else {
      await whiteboardStore.addAction(id, body);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'İşlem eklenemedi.' }, { status: 500 });
  }
}
