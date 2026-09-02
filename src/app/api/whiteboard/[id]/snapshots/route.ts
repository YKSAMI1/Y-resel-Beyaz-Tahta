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

// Snapshot kaydet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, actions } = body;
    if (!name || !actions) {
      return NextResponse.json({ error: 'İsim ve aksiyonlar gerekli.' }, { status: 400 });
    }
    const snap = await whiteboardStore.saveSnapshot(id, name, actions);
    return NextResponse.json({ snapshot: snap });
  } catch {
    return NextResponse.json({ error: 'Snapshot kaydedilemedi.' }, { status: 500 });
  }
}
