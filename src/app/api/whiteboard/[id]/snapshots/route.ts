import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Snapshot listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snapshots = await whiteboardStore.getSnapshots(id);
    return NextResponse.json({ snapshots });
  } catch {
    return NextResponse.json({ error: 'Snapshotlar yüklenemedi.' }, { status: 500 });
  }
}

// Snapshot kaydet — max 5 oto + 5 manuel = 10 toplam
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, actions, createdBy, isAuto } = body;
    if (!name || !actions) {
      return NextResponse.json({ error: 'İsim ve aksiyonlar gerekli.' }, { status: 400 });
    }

    // Mevcut snapshot sayisini kontrol et
    const existing = await whiteboardStore.getSnapshots(id);
    const autoSnaps = existing.filter(s => s.isAuto);
    const manualSnaps = existing.filter(s => !s.isAuto);

    // Limit kontrol: oto max 5, manuel max 5
    const MAX_AUTO = 5;
    const MAX_MANUAL = 5;
    let warning: string | null = null;

    if (isAuto && autoSnaps.length >= MAX_AUTO) {
      // En eski otomatik snapshot'i sil
      const oldest = autoSnaps.sort((a, b) => a.timestamp - b.timestamp)[0];
      await whiteboardStore.deleteSnapshot(id, oldest.id);
      warning = 'En eski otomatik snapshot silindi (limit: 5)';
    } else if (!isAuto && manualSnaps.length >= MAX_MANUAL) {
      // En eski manuel snapshot'i sil
      const oldest = manualSnaps.sort((a, b) => a.timestamp - b.timestamp)[0];
      await whiteboardStore.deleteSnapshot(id, oldest.id);
      warning = 'En eski manuel snapshot silindi (limit: 5)';
    }

    const snap = await whiteboardStore.saveSnapshot(id, name, actions, createdBy || 'unknown', isAuto || false);
    return NextResponse.json({ snapshot: snap, warning });
  } catch {
    return NextResponse.json({ error: 'Snapshot kaydedilemedi.' }, { status: 500 });
  }
}
