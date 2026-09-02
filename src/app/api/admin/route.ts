import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';
import crypto from 'crypto';

// Hash function - PBKDF2 with salt
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = hashPassword(password, salt);
  return hash === storedHash;
}

// Login endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Şifre gerekli.' }, { status: 400 });
    }

    // Veritabanindan admin sifresini al
    const stored = await (whiteboardStore as any).getAdminPassword?.();
    if (!stored) {
      return NextResponse.json({ error: 'Admin şifresi ayarlanmamış.' }, { status: 500 });
    }

    if (!verifyPassword(password, stored.hash, stored.salt)) {
      return NextResponse.json({ error: 'Yanlış şifre.' }, { status: 401 });
    }

    // Basit token olustur (30 dk gecerli)
    const tokenData = JSON.stringify({ admin: true, exp: Date.now() + 30 * 60 * 1000 });
    const token = Buffer.from(tokenData).toString('base64');

    return NextResponse.json({ ok: true, token });
  } catch {
    return NextResponse.json({ error: 'Giriş hatası.' }, { status: 500 });
  }
}

// Tüm tahtaları listele (admin)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token gerekli.' }, { status: 401 });
    }

    // Token dogrulama
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      if (!decoded.admin || decoded.exp < Date.now()) {
        return NextResponse.json({ error: 'Token süresi dolmuş.' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Geçersiz token.' }, { status: 401 });
    }

    const whiteboards = await whiteboardStore.listWhiteboards();
    return NextResponse.json({ whiteboards });
  } catch {
    return NextResponse.json({ error: 'Liste alınamadı.' }, { status: 500 });
  }
}
