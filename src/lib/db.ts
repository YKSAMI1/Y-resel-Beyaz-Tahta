// ============================================
// Supabase PostgreSQL veritabanı bağlantısı
// ============================================

import { sql } from '@vercel/postgres';
export { sql };

// Supabase connection string - hardcoded for simplicity
const SUPABASE_URL = 'postgresql://postgres.xcyjjmlkwihhmnmqrb:8%26oqO%25YsB4oJPC%24Rhn9gP@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

// Override POSTGRES_URL if not set
if (!process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = SUPABASE_URL;
}

export const hasDb = true;

// getPool export - store.ts icin gerekli (fallback)
export function getPool() {
  return null as any;
}

// Tabloları oluştur (ilk çalıştırmada)
let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;

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

    await sql`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT 0
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_images_whiteboard ON images(whiteboard_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS abuse_log (
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        count INT NOT NULL DEFAULT 1,
        first_delete_at BIGINT NOT NULL,
        blocked_until BIGINT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (whiteboard_id, user_id)
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Snapshot',
        actions_data JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'unknown',
        is_auto BOOLEAN NOT NULL DEFAULT false
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_snapshots_whiteboard ON snapshots(whiteboard_id)`;
    await sql`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'unknown'`.catch(() => {});
    await sql`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT false`.catch(() => {});

    await sql`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_broadcasts_whiteboard ON broadcasts(whiteboard_id, created_at)`;

    await sql`
      CREATE TABLE IF NOT EXISTS active_users (
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#2563eb',
        last_seen BIGINT NOT NULL,
        PRIMARY KEY (whiteboard_id, user_id)
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_active_users_whiteboard ON active_users(whiteboard_id, last_seen)`;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_config (
        id TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        salt TEXT NOT NULL
      )`;

    schemaReady = true;
  } catch (e) {
    console.error('Schema init hatasi:', e);
  }
}
