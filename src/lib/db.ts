// ============================================
// Vercel Postgres veritabanı bağlantısı
// Yerel geliştirme: fallback olarak bellek içi depo kullanılır
// ============================================

import { sql } from '@vercel/postgres';

const isProd = !!process.env.POSTGRES_URL;

// Tabloları oluştur (ilk çalıştırmada)
let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  if (!isProd) return; // Yerelde tablo gerekmez

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS whiteboards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Yeni Tahta',
        settings JSONB DEFAULT '{}',
        owner_id TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT,
        layers JSONB DEFAULT '[]',
        blocked_users TEXT[] DEFAULT '{}'
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        user_id TEXT NOT NULL,
        timestamp BIGINT NOT NULL DEFAULT 0
      )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_actions_whiteboard ON actions(whiteboard_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_actions_ts ON actions(whiteboard_id, timestamp)`;

    await sql`
      CREATE TABLE IF NOT EXISTS deleted_ids (
        id TEXT NOT NULL,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        deleted_at BIGINT NOT NULL,
        PRIMARY KEY (id, whiteboard_id)
      )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_deleted_whiteboard ON deleted_ids(whiteboard_id, deleted_at)`;

    schemaReady = true;
  } catch (e) {
    console.error('Schema initialization failed:', e);
  }
}

export { sql, isProd };
