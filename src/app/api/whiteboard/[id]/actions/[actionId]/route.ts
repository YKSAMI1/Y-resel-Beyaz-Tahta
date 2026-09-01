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

    const url = new URL(request.url);
    const clearDeleted = url.searchParams.get('clearDeleted');
    if (clearDeleted === 'true') {
      // Geri alma islemi: deleted_ids kaydini temizle
      await whiteboardStore.clearDeletedId(id, actionId);
    } else {
      await whiteboardStore.removeAction(id, actionId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'İşlem silinemedi.' }, { status: 500 });
  }
}
