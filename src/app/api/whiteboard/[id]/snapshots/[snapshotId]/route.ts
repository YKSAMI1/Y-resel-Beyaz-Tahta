import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Snapshot yükle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id, snapshotId } = await params;
    const actions = await whiteboardStore.loadSnapshot(id, snapshotId);
    if (!actions) {
      return NextResponse.json({ error: 'Snapshot bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json({ actions });
  } catch {
    return NextResponse.json({ error: 'Snapshot yüklenemedi.' }, { status: 500 });
  }
}

// Snapshot sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  try {
    const { id, snapshotId } = await params;
    await whiteboardStore.deleteSnapshot(id, snapshotId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Snapshot silinemedi.' }, { status: 500 });
  }
}
