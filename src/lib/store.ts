// ============================================
// Veri deposu
// - Üretim (Vercel): Vercel Postgres
// - Yerel geliştirme: Bellek içi (in-memory)
// ============================================

import { Whiteboard, Participant, DrawAction, WhiteboardSettings } from '@/types';
import { sql, isProd, ensureSchema } from './db';

// ===== Bellek içi depo (yerel geliştirme) =====
interface StoredWhiteboard {
  whiteboard: Whiteboard;
  participants: Map<string, Participant>;
  actions: DrawAction[];
  deletedIds: { id: string; timestamp: number }[];
}

class InMemoryStore {
  private whiteboards: Map<string, StoredWhiteboard> = new Map();

  async init() { /* no-op */ }

  async createWhiteboard(id: string, name: string, settings: WhiteboardSettings, ownerId: string): Promise<Whiteboard> {
    const now = Date.now();
    const whiteboard: Whiteboard = {
      id, name, settings, ownerId, createdAt: now, expiresAt: null,
      layers: [{ id: 'layer-default', name: 'Varsayılan Katman', visible: true, locked: false, opacity: 1, order: 0 }],
      blockedUsers: [],
    };
    this.whiteboards.set(id, { whiteboard, participants: new Map(), actions: [], deletedIds: [] });
    return whiteboard;
  }

  async getWhiteboard(id: string): Promise<StoredWhiteboard | undefined> {
    const stored = this.whiteboards.get(id);
    if (!stored) return undefined;
    if (stored.whiteboard.expiresAt && stored.whiteboard.expiresAt < Date.now()) {
      this.whiteboards.delete(id);
      return undefined;
    }
    return stored;
  }

  async addAction(id: string, action: DrawAction): Promise<void> {
    const stored = this.whiteboards.get(id);
    if (!stored) return;
    stored.actions.push(action);
    if (stored.actions.length > 5000) stored.actions = stored.actions.slice(-5000);
  }

  async setActions(id: string, newActions: DrawAction[]): Promise<void> {
    const stored = this.whiteboards.get(id);
    if (!stored) return;
    stored.actions = newActions.slice(-5000);
  }

  async getActions(id: string, since: number = 0): Promise<{ actions: DrawAction[]; deletedIds: string[] }> {
    const stored = this.whiteboards.get(id);
    if (!stored) return { actions: [], deletedIds: [] };
    const allActions = since > 0 ? stored.actions.filter(a => a.timestamp > since) : stored.actions;
    const deletedIds = since > 0 ? stored.deletedIds.filter(d => d.timestamp > since).map(d => d.id) : [];
    return { actions: allActions, deletedIds };
  }

  async removeAction(id: string, actionId: string): Promise<void> {
    const stored = this.whiteboards.get(id);
    if (!stored) return;
    stored.actions = stored.actions.filter(a => a.id !== actionId);
    stored.deletedIds.push({ id: actionId, timestamp: Date.now() });
  }

  async updateSettings(id: string, settings: Partial<WhiteboardSettings>): Promise<Whiteboard | null> {
    const stored = this.whiteboards.get(id);
    if (!stored) return null;
    stored.whiteboard.settings = { ...stored.whiteboard.settings, ...settings };
    return stored.whiteboard;
  }

  async clearWhiteboard(id: string): Promise<void> {
    const stored = this.whiteboards.get(id);
    if (!stored) return;
    stored.actions = [];
  }
}

// ===== Vercel Postgres deposu (üretim) =====
class PostgresStore {
  async init() {
    await ensureSchema();
  }

  async createWhiteboard(id: string, name: string, settings: WhiteboardSettings, ownerId: string): Promise<Whiteboard> {
    const now = Date.now();
    const whiteboard: Whiteboard = {
      id, name, settings, ownerId, createdAt: now, expiresAt: null,
      layers: [{ id: 'layer-default', name: 'Varsayılan Katman', visible: true, locked: false, opacity: 1, order: 0 }],
      blockedUsers: [],
    };

    await sql`
      INSERT INTO whiteboards (id, name, settings, owner_id, created_at, layers)
      VALUES (${id}, ${name}, ${JSON.stringify(settings)}, ${ownerId}, ${now}, ${JSON.stringify(whiteboard.layers)})
      ON CONFLICT (id) DO NOTHING`;

    return whiteboard;
  }

  async getWhiteboard(id: string): Promise<StoredWhiteboard | undefined> {
    const result = await sql`SELECT * FROM whiteboards WHERE id = ${id}`;
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    if (row.expires_at && row.expires_at < Date.now()) {
      await sql`DELETE FROM whiteboards WHERE id = ${id}`;
      return undefined;
    }
    return {
      whiteboard: {
        id: row.id,
        name: row.name,
        settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        layers: typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers,
        blockedUsers: row.blocked_users || [],
      },
      participants: new Map(),
      actions: [],
      deletedIds: [],
    };
  }

  async addAction(id: string, action: DrawAction): Promise<void> {
    await sql`
      INSERT INTO actions (id, whiteboard_id, data, user_id, timestamp)
      VALUES (${action.id}, ${id}, ${JSON.stringify(action)}, ${action.userId}, ${action.timestamp})
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(action)}, timestamp = ${action.timestamp}`;
  }

  async setActions(id: string, newActions: DrawAction[]): Promise<void> {
    // Toplu güncelleme: mevcutları sil, yenilerini ekle
    await sql`DELETE FROM actions WHERE whiteboard_id = ${id}`;
    for (const action of newActions.slice(-5000)) {
      await sql`
        INSERT INTO actions (id, whiteboard_id, data, user_id, timestamp)
        VALUES (${action.id}, ${id}, ${JSON.stringify(action)}, ${action.userId}, ${action.timestamp})
        ON CONFLICT (id) DO NOTHING`;
    }
  }

  async getActions(id: string, since: number = 0): Promise<{ actions: DrawAction[]; deletedIds: string[] }> {
    let rows;
    if (since > 0) {
      rows = await sql`SELECT data FROM actions WHERE whiteboard_id = ${id} AND timestamp > ${since} ORDER BY timestamp`;
    } else {
      rows = await sql`SELECT data FROM actions WHERE whiteboard_id = ${id} ORDER BY timestamp`;
    }
    const deletedResult = since > 0
      ? await sql`SELECT id FROM deleted_ids WHERE whiteboard_id = ${id} AND deleted_at > ${since}`
      : { rows: [] };
    return {
      actions: rows.rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
      deletedIds: deletedResult.rows.map(r => r.id),
    };
  }

  async removeAction(id: string, actionId: string): Promise<void> {
    await sql`DELETE FROM actions WHERE id = ${actionId} AND whiteboard_id = ${id}`;
    await sql`INSERT INTO deleted_ids (id, whiteboard_id, deleted_at) VALUES (${actionId}, ${id}, ${Date.now()}) ON CONFLICT DO NOTHING`;
  }

  async updateSettings(id: string, settings: Partial<WhiteboardSettings>): Promise<Whiteboard | null> {
    const result = await sql`SELECT * FROM whiteboards WHERE id = ${id}`;
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const currentSettings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
    const newSettings = { ...currentSettings, ...settings };
    await sql`UPDATE whiteboards SET settings = ${JSON.stringify(newSettings)} WHERE id = ${id}`;
    return {
      id: row.id, name: row.name, settings: newSettings, ownerId: row.owner_id,
      createdAt: row.created_at, expiresAt: row.expires_at,
      layers: typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers,
      blockedUsers: row.blocked_users || [],
    };
  }

  async clearWhiteboard(id: string): Promise<void> {
    await sql`DELETE FROM actions WHERE whiteboard_id = ${id}`;
    await sql`DELETE FROM deleted_ids WHERE whiteboard_id = ${id}`;
  }
}

// ===== Store export =====
const globalStore = globalThis as any;
if (!globalStore.__whiteboardStore) {
  globalStore.__whiteboardStore = isProd ? new PostgresStore() : new InMemoryStore();
}

export const whiteboardStore: InMemoryStore | PostgresStore = globalStore.__whiteboardStore;
