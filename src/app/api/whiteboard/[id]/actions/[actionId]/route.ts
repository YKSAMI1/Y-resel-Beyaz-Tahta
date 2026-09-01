import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Action sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { id, actionId } = await params;
    const stored = await whiteboardStore.getWhiteboard(id);
    if (!stored) {
      return NextResponse.json({ error: 'Tahta bulunamadı.' }, { status: 404 });
    }

    await whiteboardStore.removeAction(id, actionId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'İşlem silinemedi.' }, { status: 500 });
  }
}
