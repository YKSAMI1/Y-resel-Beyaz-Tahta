import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Heartbeat: kullanici aktif oldugunu bildir
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, nickname, color } = body;
    if (!userId || !nickname) {
      return NextResponse.json({ error: 'Eksik veri.' }, { status: 400 });
    }
    await whiteboardStore.heartbeat(id, userId, nickname, color || '#2563eb');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Heartbeat alinamadi.' }, { status: 500 });
  }
}

// Aktif kullancilari listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const users = await whiteboardStore.getActiveUsers(id);
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Kullanici listesi alinamadi.' }, { status: 500 });
  }
}
