import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

const ADMIN_KEY = 'yoresel-admin-2024';

// Tüm tahtaları listele (admin)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 });
    }
    const whiteboards = await whiteboardStore.listWhiteboards();
    return NextResponse.json({ whiteboards });
  } catch {
    return NextResponse.json({ error: 'Liste alınamadı.' }, { status: 500 });
  }
}
