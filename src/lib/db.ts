// ============================================
// Veritabanı bağlantısı
// POSTGRES_URL varsa onu kullan, yoksa Neon'a bağlan
// Pool tembel (lazy) oluşturulur - module yüklemede bağlanmaz
// ============================================

import { createPool } from '@vercel/postgres';

// Neon connection string
const NEON_URL = 'postgresql://neondb_owner:npg_EplT5vBmrPJ0@ep-holy-bread-b1pcur1x-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Connection string seçimi
const connStr = process.env.POSTGRES_URL || NEON_URL;

export const hasDb = !!connStr;
export const isProd = !!connStr;

// Lazy pool — sadece ilk kullanımda bağlan
let _sql: ReturnType<typeof createPool>['sql'] | null = null;

function getSql() {
  if (!_sql && connStr) {
    _sql = createPool({ connectionString: connStr }).sql;
  }
  return _sql;
}

// sql'i export et — tagged template destekli
// Kullanım: sql`SELECT * FROM ...` — tagged template call
export function sql(strings: TemplateStringsArray, ...values: any[]) {
  const realSql = getSql();
  if (!realSql) throw new Error('Veritabanı bağlantısı yok');
  return realSql(strings, ...values);
}

// Tabloları oluştur
let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  if (!hasDb) return;

  try {
    const realSql = getSql();
    if (!realSql) return;

    await realSql`
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

    await realSql`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        user_id TEXT NOT NULL,
        timestamp BIGINT NOT NULL DEFAULT 0
      )`;

    await realSql`CREATE INDEX IF NOT EXISTS idx_actions_whiteboard ON actions(whiteboard_id)`;
    await realSql`CREATE INDEX IF NOT EXISTS idx_actions_ts ON actions(whiteboard_id, timestamp)`;

    await realSql`
      CREATE TABLE IF NOT EXISTS deleted_ids (
        id TEXT NOT NULL,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        deleted_at BIGINT NOT NULL,
        PRIMARY KEY (id, whiteboard_id)
      )`;

    await realSql`CREATE INDEX IF NOT EXISTS idx_deleted_whiteboard ON deleted_ids(whiteboard_id, deleted_at)`;

    await realSql`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT 0
      )`;
    await realSql`CREATE INDEX IF NOT EXISTS idx_images_whiteboard ON images(whiteboard_id)`;

    await realSql`
      CREATE TABLE IF NOT EXISTS abuse_log (
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        count INT NOT NULL DEFAULT 1,
        first_delete_at BIGINT NOT NULL,
        blocked_until BIGINT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (whiteboard_id, user_id)
      )`;

    await realSql`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Snapshot',
        actions_data JSONB NOT NULL,
        created_at BIGINT NOT NULL
      )`;
    await realSql`CREATE INDEX IF NOT EXISTS idx_snapshots_whiteboard ON snapshots(whiteboard_id)`;

    await realSql`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`;
    await realSql`CREATE INDEX IF NOT EXISTS idx_broadcasts_whiteboard ON broadcasts(whiteboard_id, created_at)`;

    await realSql`
      CREATE TABLE IF NOT EXISTS active_users (
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#2563eb',
        last_seen BIGINT NOT NULL,
        PRIMARY KEY (whiteboard_id, user_id)
      )`;
    await realSql`CREATE INDEX IF NOT EXISTS idx_active_users_whiteboard ON active_users(whiteboard_id, last_seen)`;

    schemaReady = true;
  } catch (e) {
    console.error('Schema initialization failed:', e);
  }
}
