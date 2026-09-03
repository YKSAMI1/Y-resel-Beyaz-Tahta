// ============================================
// Supabase PostgreSQL veritabanı bağlantısı
// pg paketi ile doğrudan bağlantı
// ============================================

const SUPABASE_URL = 'postgresql://postgres.xcyjjmlkwihhmnmqrb:8%26oqO%25YsB4oJPC%24Rhn9gP@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

export const hasDb = true;

// pg pool - lazy init
let _pool: any = null;

function getPool() {
  if (!_pool) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pg = require('pg');
    _pool = new pg.Pool({
      connectionString: SUPABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _pool;
}

export { getPool };

// sql tagged template compatibility for store.ts
export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any> {
  const pool = getPool();
  let query = '';
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      query += `$${i + 1}`;
    }
  }
  return pool.query(query, values);
}

// Tabloları oluştur (ilk çalıştırmada)
let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;

  const pool = getPool();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whiteboards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Yeni Tahta',
        settings JSONB DEFAULT '{}',
        owner_id TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT,
        layers JSONB DEFAULT '[]',
        blocked_users TEXT[] DEFAULT '{}'
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        user_id TEXT NOT NULL,
        timestamp BIGINT NOT NULL DEFAULT 0
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_actions_whiteboard ON actions(whiteboard_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_actions_ts ON actions(whiteboard_id, timestamp)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_ids (
        id TEXT NOT NULL,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        deleted_at BIGINT NOT NULL,
        PRIMARY KEY (id, whiteboard_id)
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deleted_whiteboard ON deleted_ids(whiteboard_id, deleted_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT 0
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_images_whiteboard ON images(whiteboard_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS abuse_log (
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        count INT NOT NULL DEFAULT 1,
        first_delete_at BIGINT NOT NULL,
        blocked_until BIGINT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (whiteboard_id, user_id)
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Snapshot',
        actions_data JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'unknown',
        is_auto BOOLEAN NOT NULL DEFAULT false
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_snapshots_whiteboard ON snapshots(whiteboard_id)`);
    await pool.query(`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'unknown'`).catch(() => {});
    await pool.query(`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT false`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_broadcasts_whiteboard ON broadcasts(whiteboard_id, created_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_users (
        whiteboard_id TEXT NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#2563eb',
        last_seen BIGINT NOT NULL,
        PRIMARY KEY (whiteboard_id, user_id)
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_active_users_whiteboard ON active_users(whiteboard_id, last_seen)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_config (
        id TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        salt TEXT NOT NULL
      )`);

    schemaReady = true;
    console.log('Supabase schema initialized successfully');
  } catch (e) {
    console.error('Schema init hatasi:', e);
  }
}
