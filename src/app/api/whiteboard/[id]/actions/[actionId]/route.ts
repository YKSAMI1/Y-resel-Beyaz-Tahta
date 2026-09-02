import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Action sil + abuse korumasi
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
    const userId = url.searchParams.get('userId') || 'unknown';

    if (clearDeleted === 'true') {
      // Geri alma islemi: deleted_ids kaydini temizle
      await whiteboardStore.clearDeletedId(id, actionId);
    } else {
      // Abuse kontrolu: cok fazla silme yapiyor mu?
      const abuseResult = await whiteboardStore.recordDelete(id, userId);
      if (abuseResult.blocked) {
        // Geri al: silinen action'lari geri yukle
        const current = await whiteboardStore.getActions(id);
        return NextResponse.json({
          ok: false,
          blocked: true,
          blockedUntil: abuseResult.blockedUntil,
          message: 'Cok fazla silme islemi yaptiniz. Bir sure bekleyin.',
        }, { status: 429 });
      }
      await whiteboardStore.removeAction(id, actionId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'İşlem silinemedi.' }, { status: 500 });
  }
}
