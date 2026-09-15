import { NextRequest, NextResponse } from 'next/server';
import { whiteboardStore } from '@/lib/store';

// Gorselleri ayri olarak getir — lazy loading icin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const actionIds = searchParams.get('ids'); // virgullu action id listesi

    if (!actionIds) {
      // Tum gorsellerin id'lerini don (boyut olmadan)
      const allIds = await whiteboardStore.getImageIds(id);
      return NextResponse.json({ imageIds: allIds });
    }

    // Belirli gorselleri getir
    const ids = actionIds.split(',');
    const images: Record<string, string> = {};
    for (const actionId of ids) {
      const data = await whiteboardStore.getImage(id, actionId + '_img');
      if (data) images[actionId] = data;
    }
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: 'Gorseller yuklenemedi.' }, { status: 500 });
  }
}
