import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Broadcastleri listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0');
    const broadcasts = await whiteboardStore.getBroadcasts(id, since);
    return NextResponse.json({ broadcasts });
  } catch {
    return NextResponse.json({ error: 'Broadcastler yüklenemedi.' }, { status: 500 });
  }
}

// Broadcast gonder (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, adminKey } = body;
    
    // Basit admin key kontrolu
    if (adminKey !== 'yoresel-admin-2024') {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mesaj boş olamaz.' }, { status: 400 });
    }
    
    await whiteboardStore.addBroadcast(id, message.trim());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Broadcast gönderilemedi.' }, { status: 500 });
  }
}
