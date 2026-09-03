import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';
import crypto from 'crypto';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// İlk kez admin şifresi belirle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Şifre en az 4 karakter olmalı.' }, { status: 400 });
    }

    // Mevcut şifre var mı kontrol et
    const existing = await (whiteboardStore as any).getAdminPassword?.();
    if (existing) {
      return NextResponse.json({ error: 'Admin şifresi zaten ayarlanmış. Değiştirmek için panels://yoresel-beyaz-tahta.vercel.app/admin adresinden girin.' }, { status: 400 });
    }

    // Yeni şifre oluştur
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = hashPassword(password, salt);

    await (whiteboardStore as any).setAdminPassword?.(hash, salt);

    return NextResponse.json({ ok: true, message: 'Admin şifresi ayarlandı!' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
