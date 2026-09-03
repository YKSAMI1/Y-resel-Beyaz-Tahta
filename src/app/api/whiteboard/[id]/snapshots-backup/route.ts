import { NextRequest, NextResponse } from 'next/server';

// VDS PostgreSQL connection for backup
const VDS_URL = 'postgresql://whiteboard:8%26oqO%25YsB4oJPC%24Rhn9gP@yikimdara.com.tr:5432/whiteboard_db';

async function getVdsPool() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pg = require('pg');
  return new pg.Pool({
    connectionString: VDS_URL,
    ssl: false,
    max: 2,
    connectTimeoutMillis: 5000,
  });
}

// Snapshot'ı VDS'ye yedekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { snapshotId, name, actionsData, createdBy, isAuto } = body;

    const pool = await getVdsPool();
    try {
      // VDS'de snapshots tablosu yoksa oluştur
      await pool.query(`
        CREATE TABLE IF NOT EXISTS snapshots (
          id TEXT PRIMARY KEY,
          whiteboard_id TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT 'Snapshot',
          actions_data JSONB NOT NULL,
          created_at BIGINT NOT NULL,
          created_by TEXT NOT NULL DEFAULT 'unknown',
          is_auto BOOLEAN NOT NULL DEFAULT false
        )
      `);

      // Snapshot'ı VDS'ye kaydet
      await pool.query(
        'INSERT INTO snapshots (id, whiteboard_id, name, actions_data, created_at, created_by, is_auto) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET actions_data = $4::jsonb',
        [snapshotId, id, name, JSON.stringify(actionsData), Date.now(), createdBy || 'unknown', isAuto || false]
      );

      return NextResponse.json({ success: true, message: 'Snapshot VDS\'ye yedeklendi' });
    } finally {
      await pool.end();
    }
  } catch (e: any) {
    console.error('VDS backup error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// VDS'den snapshot'ları listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = await getVdsPool();
    try {
      const result = await pool.query(
        'SELECT id, name, created_at, created_by, is_auto FROM snapshots WHERE whiteboard_id = $1 ORDER BY created_at DESC',
        [id]
      );
      return NextResponse.json({ snapshots: result.rows });
    } finally {
      await pool.end();
    }
  } catch (e: any) {
    return NextResponse.json({ snapshots: [] });
  }
}
