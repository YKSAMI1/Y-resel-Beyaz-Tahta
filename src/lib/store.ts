// ============================================
// Veri deposu
// - Neon PostgreSQL: Veritabaninda saklama
// - Yerel gelistirme: Bellek ici (in-memory)
// ============================================

import { Whiteboard, Participant, DrawAction, WhiteboardSettings } from '@/types';
import { sql, hasDb, ensureSchema } from './db';

// ===== Bellek ici depo (yerel gelistirme) =====
interface StoredWhiteboard {
  whiteboard: Whiteboard;
  participants: Map<string, Participant>;
  actions: DrawAction[];
  deletedIds: { id: string; timestamp: number }[];
  snapshots: { id: string; name: string; actions: DrawAction[]; timestamp: number; createdBy: string; isAuto: boolean }[];
  deleteCounts: Map<string, { count: number; firstDeleteAt: number; blockedUntil: number }>;
  activeUsers: Map<string, { nickname: string; lastSeen: number; color: string }>;
}

class InMemoryStore {
  private whiteboards: Map<string, StoredWhiteboard> = new Map();

  async createWhiteboard(id: string, name: string, settings: WhiteboardSettings, ownerId: string): Promise<Whiteboard> {
    const now = Date.now();
    const whiteboard: Whiteboard = {
      id, name, settings, ownerId, createdAt: now, expiresAt: null,
      layers: [{ id: 'layer-default', name: 'Varsayilan Katman', visible: true, locked: false, opacity: 1, order: 0 }],
      blockedUsers: [],
    };
    this.whiteboards.set(id, { whiteboard, participants: new Map(), actions: [], deletedIds: [], snapshots: [], deleteCounts: new Map(), activeUsers: new Map() });
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

  // Upsert: mevcut action'lari silmeden ekle/guncelle
  async upsertActions(id: string, actionsToUpsert: DrawAction[]): Promise<void> {
    const stored = this.whiteboards.get(id);
    if (!stored) return;
    const map = new Map(stored.actions.map(a => [a.id, a]));
    for (const action of actionsToUpsert) {
      map.set(action.id, action);
    }
    stored.actions = Array.from(map.values()).slice(-5000);
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

  async clearDeletedId(id: string, actionId: string): Promise<void> {
    const stored = this.whiteboards.get(id);
    if (!stored) return;
    stored.deletedIds = stored.deletedIds.filter(d => d.id !== actionId);
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

  // Abuse tracking
  async recordDelete(whiteboardId: string, userId: string): Promise<{ blocked: boolean; blockedUntil: number }> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return { blocked: false, blockedUntil: 0 };
    const now = Date.now();
    const WINDOW = 60 * 1000; // 1 minute window
    const THRESHOLD = 15; // max deletes per window
    const BAN_DURATION = 5 * 60 * 1000; // 5 min ban
    let entry = stored.deleteCounts.get(userId);
    if (!entry || now - entry.firstDeleteAt > WINDOW) {
      entry = { count: 1, firstDeleteAt: now, blockedUntil: 0 };
    } else {
      entry.count++;
    }
    if (entry.count >= THRESHOLD && entry.blockedUntil < now) {
      entry.blockedUntil = now + BAN_DURATION;
    }
    stored.deleteCounts.set(userId, entry);
    return { blocked: entry.blockedUntil > now, blockedUntil: entry.blockedUntil };
  }

  async isUserBlocked(whiteboardId: string, userId: string): Promise<boolean> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return false;
    const entry = stored.deleteCounts.get(userId);
    return entry ? entry.blockedUntil > Date.now() : false;
  }

  async undoUserDeletes(whiteboardId: string, userId: string): Promise<void> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return;
    // Find actions by this user that were deleted recently
    const recentDeletions = stored.deletedIds.filter(d => {
      const action = stored.actions.find(a => a.id === d.id);
      return !action; // action was deleted
    });
    // We can't easily know who deleted what, so we just unblock
    stored.deleteCounts.delete(userId);
  }

  // Snapshots
  async saveSnapshot(whiteboardId: string, name: string, actions: DrawAction[], createdBy: string = 'unknown', isAuto: boolean = false): Promise<{ id: string; name: string; timestamp: number }> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) throw new Error('Whiteboard not found');
    const snap = { id: 'snap_' + Date.now(), name, actions: JSON.parse(JSON.stringify(actions)), timestamp: Date.now(), createdBy, isAuto };
    stored.snapshots.push(snap);
    // Auto-snapshots: max 15, delete oldest. User snapshots: unlimited
    const autoSnaps = stored.snapshots.filter(s => s.isAuto);
    const userSnaps = stored.snapshots.filter(s => !s.isAuto);
    if (autoSnaps.length > 15) {
      const toRemove = autoSnaps.slice(0, autoSnaps.length - 15);
      const removeIds = new Set(toRemove.map(s => s.id));
      stored.snapshots = stored.snapshots.filter(s => !removeIds.has(s.id));
    }
    return { id: snap.id, name: snap.name, timestamp: snap.timestamp };
  }

  async getSnapshots(whiteboardId: string): Promise<{ id: string; name: string; timestamp: number; createdBy: string; isAuto: boolean }[]> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return [];
    return stored.snapshots.map(s => ({ id: s.id, name: s.name, timestamp: s.timestamp, createdBy: s.createdBy, isAuto: s.isAuto }));
  }

  async loadSnapshot(whiteboardId: string, snapshotId: string): Promise<DrawAction[] | null> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return null;
    const snap = stored.snapshots.find(s => s.id === snapshotId);
    return snap ? snap.actions : null;
  }

  async deleteSnapshot(whiteboardId: string, snapshotId: string): Promise<void> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return;
    stored.snapshots = stored.snapshots.filter(s => s.id !== snapshotId);
  }

  // Broadcast messages
  async getBroadcasts(whiteboardId: string, since: number = 0): Promise<{ message: string; timestamp: number }[]> {
    return []; // In-memory doesn't persist broadcasts
  }

  async addBroadcast(whiteboardId: string, message: string): Promise<void> {
    // No-op for in-memory
  }

  // Participant heartbeat
  async heartbeat(whiteboardId: string, userId: string, nickname: string, color: string): Promise<void> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return;
    stored.activeUsers.set(userId, { nickname, lastSeen: Date.now(), color });
  }

  async getActiveUsers(whiteboardId: string): Promise<{ userId: string; nickname: string; color: string }[]> {
    const stored = this.whiteboards.get(whiteboardId);
    if (!stored) return [];
    const now = Date.now();
    const TIMEOUT = 10000; // 10 seconds
    const result: { userId: string; nickname: string; color: string }[] = [];
    for (const [uid, info] of stored.activeUsers) {
      if (now - info.lastSeen < TIMEOUT) {
        result.push({ userId: uid, nickname: info.nickname, color: info.color });
      }
    }
    return result;
  }

  // List all whiteboards (admin)
  async listWhiteboards(): Promise<{ id: string; name: string; createdAt: number; actionCount: number }[]> {
    const result: { id: string; name: string; createdAt: number; actionCount: number }[] = [];
    for (const [id, stored] of this.whiteboards) {
      result.push({ id, name: stored.whiteboard.name, createdAt: stored.whiteboard.createdAt, actionCount: stored.actions.length });
    }
    return result;
  }

  // Admin password (in-memory fallback)
  private adminPassword: { hash: string; salt: string } | null = null;

  async getAdminPassword(): Promise<{ hash: string; salt: string } | null> {
    return this.adminPassword;
  }

  async setAdminPassword(hash: string, salt: string): Promise<void> {
    this.adminPassword = { hash, salt };
  }
}

// Buyuk alanlari (base64 fotograflar) veritabanindan cikar
function stripLargeFields(action: DrawAction): DrawAction {
  const { imageSrc, fillBitmap, ...rest } = action as any;
  return rest;
}

// ===== Neon PostgreSQL deposu =====
class PostgresStore {
  private ready = false;

  private async ensureReady() {
    if (!this.ready) {
      await ensureSchema();
      this.ready = true;
    }
  }

  async createWhiteboard(id: string, name: string, settings: WhiteboardSettings, ownerId: string): Promise<Whiteboard> {
    await this.ensureReady();
    const now = Date.now();
    const whiteboard: Whiteboard = {
      id, name, settings, ownerId, createdAt: now, expiresAt: null,
      layers: [{ id: 'layer-default', name: 'Varsayilan Katman', visible: true, locked: false, opacity: 1, order: 0 }],
      blockedUsers: [],
    };
    await sql`INSERT INTO whiteboards (id, name, settings, owner_id, created_at, layers) VALUES (${id}, ${name}, ${JSON.stringify(whiteboard.settings)}, ${ownerId}, ${now}, ${JSON.stringify(whiteboard.layers)}) ON CONFLICT (id) DO NOTHING`;
    return whiteboard;
  }

  async getWhiteboard(id: string): Promise<StoredWhiteboard | undefined> {
    await this.ensureReady();
    const result = await sql`SELECT * FROM whiteboards WHERE id = ${id}`;
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      whiteboard: {
        id: row.id, name: row.name,
        settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
        ownerId: row.owner_id, createdAt: row.created_at, expiresAt: row.expires_at,
        layers: typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers,
        blockedUsers: row.blocked_users || [],
      },
      participants: new Map(), actions: [], deletedIds: [],
      snapshots: [], deleteCounts: new Map(), activeUsers: new Map(),
    };
  }

  async addAction(id: string, action: DrawAction): Promise<void> {
    await this.ensureReady();
    const { imageSrc, ...safe } = action as any;
    await sql`INSERT INTO actions (id, whiteboard_id, data, user_id, timestamp) VALUES (${action.id}, ${id}, ${JSON.stringify(safe)}, ${action.userId}, ${action.timestamp}) ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(safe)}, timestamp = ${action.timestamp}`;
    // Fotografi ayri tabloya kaydet
    if (imageSrc) {
      await sql`INSERT INTO images (id, whiteboard_id, data, created_at) VALUES (${action.id + '_img'}, ${id}, ${imageSrc}, ${Date.now()}) ON CONFLICT (id) DO UPDATE SET data = ${imageSrc}`;
    }
  }

  async setActions(id: string, newActions: DrawAction[]): Promise<void> {
    // setActions artik sadece snapshot yukleme icin - DB'deki mevcut verileri sil
    await this.ensureReady();
    await sql`DELETE FROM actions WHERE whiteboard_id = ${id}`;
    await sql`DELETE FROM images WHERE whiteboard_id = ${id}`;
    for (const action of newActions.slice(-5000)) {
      const { imageSrc, ...safe } = action as any;
      await sql`INSERT INTO actions (id, whiteboard_id, data, user_id, timestamp) VALUES (${action.id}, ${id}, ${JSON.stringify(safe)}, ${action.userId}, ${action.timestamp}) ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(safe)}, timestamp = ${action.timestamp}`;
      if (imageSrc) {
        await sql`INSERT INTO images (id, whiteboard_id, data, created_at) VALUES (${action.id + '_img'}, ${id}, ${imageSrc}, ${Date.now()}) ON CONFLICT (id) DO UPDATE SET data = ${imageSrc}`;
      }
    }
  }

  // Upsert: mevcut action'lari silmeden ekle/guncelle
  async upsertActions(id: string, actionsToUpsert: DrawAction[]): Promise<void> {
    await this.ensureReady();
    for (const action of actionsToUpsert.slice(-5000)) {
      const { imageSrc, ...safe } = action as any;
      await sql`INSERT INTO actions (id, whiteboard_id, data, user_id, timestamp) VALUES (${action.id}, ${id}, ${JSON.stringify(safe)}, ${action.userId || 'unknown'}, ${action.timestamp}) ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(safe)}, timestamp = ${action.timestamp}`;
      if (imageSrc) {
        await sql`INSERT INTO images (id, whiteboard_id, data, created_at) VALUES (${action.id + '_img'}, ${id}, ${imageSrc}, ${Date.now()}) ON CONFLICT (id) DO UPDATE SET data = ${imageSrc}`;
      }
    }
  }

  async getActions(id: string, since: number = 0): Promise<{ actions: DrawAction[]; deletedIds: string[] }> {
    await this.ensureReady();
    let rows;
    if (since > 0) {
      rows = await sql`SELECT data FROM actions WHERE whiteboard_id = ${id} AND timestamp > ${since} ORDER BY timestamp`;
    } else {
      rows = await sql`SELECT data FROM actions WHERE whiteboard_id = ${id} ORDER BY timestamp`;
    }
    const deletedResult = since > 0
      ? await sql`SELECT id FROM deleted_ids WHERE whiteboard_id = ${id} AND deleted_at > ${since}`
      : { rows: [] as any[] };
    const actions = rows.rows.map((r: any) => {
      const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return parsed;
    });
    // Gorselleri yukle — sadece ilk yuklemede (since=0) tum gorselleri indir,
    // incremental poll'da (since>0) sadece yeni gorselleri indir
    if (actions.length > 0 && since === 0) {
      // Ilk yukleme: tum gorselleri indir
      const imgRows = await sql`SELECT id, data FROM images WHERE whiteboard_id = ${id}`;
      if (imgRows.rows.length > 0) {
        const imgMap = new Map<string, string>();
        for (const r of imgRows.rows) { imgMap.set(r.id, r.data); }
        for (const action of actions) {
          const imgData = imgMap.get(action.id + '_img');
          if (imgData) { (action as any).imageSrc = imgData; }
        }
      }
    } else if (actions.length > 0 && since > 0) {
      // Incremental: sadece yeni gorselleri indir
      const imgIds = actions.filter((a: any) => a.type === 'image').map((a: any) => a.id + '_img');
      if (imgIds.length > 0) {
        for (const imgId of imgIds) {
          const imgRow = await sql`SELECT data FROM images WHERE id = ${imgId} AND whiteboard_id = ${id}`;
          if (imgRow.rows.length > 0) {
            const action = actions.find((a: any) => a.id + '_img' === imgId);
            if (action) { (action as any).imageSrc = imgRow.rows[0].data; }
          }
        }
      }
    }
    return {
      actions,
      deletedIds: deletedResult.rows.map((r: any) => r.id),
    };
  }

  async removeAction(id: string, actionId: string): Promise<void> {
    await this.ensureReady();
    await sql`DELETE FROM actions WHERE id = ${actionId} AND whiteboard_id = ${id}`;
    await sql`DELETE FROM images WHERE id = ${actionId + '_img'}`;
    await sql`INSERT INTO deleted_ids (id, whiteboard_id, deleted_at) VALUES (${actionId}, ${id}, ${Date.now()}) ON CONFLICT DO NOTHING`;
  }

  async clearDeletedId(id: string, actionId: string): Promise<void> {
    await this.ensureReady();
    await sql`DELETE FROM deleted_ids WHERE id = ${actionId} AND whiteboard_id = ${id}`;
  }

  async updateSettings(id: string, settings: Partial<WhiteboardSettings>): Promise<Whiteboard | null> {
    await this.ensureReady();
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
    await this.ensureReady();
    await sql`DELETE FROM actions WHERE whiteboard_id = ${id}`;
    await sql`DELETE FROM deleted_ids WHERE whiteboard_id = ${id}`;
  }

  // Abuse tracking
  async recordDelete(whiteboardId: string, userId: string): Promise<{ blocked: boolean; blockedUntil: number }> {
    await this.ensureReady();
    const now = Date.now();
    const WINDOW = 60 * 1000;
    const THRESHOLD = 15;
    const BAN_DURATION = 5 * 60 * 1000;
    const existing = await sql`SELECT count, first_delete_at, blocked_until FROM abuse_log WHERE whiteboard_id = ${whiteboardId} AND user_id = ${userId} AND first_delete_at > ${now - WINDOW}`;
    let count = 1;
    let firstDeleteAt = now;
    let blockedUntil = 0;
    if (existing.rows.length > 0) {
      count = existing.rows[0].count + 1;
      firstDeleteAt = existing.rows[0].first_delete_at;
      blockedUntil = existing.rows[0].blocked_until || 0;
    }
    if (count >= THRESHOLD && blockedUntil < now) {
      blockedUntil = now + BAN_DURATION;
    }
    await sql`INSERT INTO abuse_log (whiteboard_id, user_id, count, first_delete_at, blocked_until, updated_at) VALUES (${whiteboardId}, ${userId}, ${count}, ${firstDeleteAt}, ${blockedUntil}, ${now}) ON CONFLICT (whiteboard_id, user_id) DO UPDATE SET count = ${count}, blocked_until = ${blockedUntil}, updated_at = ${now}`;
    return { blocked: blockedUntil > now, blockedUntil };
  }

  async isUserBlocked(whiteboardId: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await sql`SELECT blocked_until FROM abuse_log WHERE whiteboard_id = ${whiteboardId} AND user_id = ${userId}`;
    if (result.rows.length === 0) return false;
    return (result.rows[0].blocked_until || 0) > Date.now();
  }

  async undoUserDeletes(whiteboardId: string, userId: string): Promise<void> {
    await this.ensureReady();
    await sql`DELETE FROM abuse_log WHERE whiteboard_id = ${whiteboardId} AND user_id = ${userId}`;
  }

  // Snapshots
  async saveSnapshot(whiteboardId: string, name: string, actions: DrawAction[], createdBy: string = 'unknown', isAuto: boolean = false): Promise<{ id: string; name: string; timestamp: number }> {
    await this.ensureReady();
    const snapId = 'snap_' + Date.now();
    const now = Date.now();
    await sql`INSERT INTO snapshots (id, whiteboard_id, name, actions_data, created_at, created_by, is_auto) VALUES (${snapId}, ${whiteboardId}, ${name}, ${JSON.stringify(actions.slice(-5000))}, ${now}, ${createdBy}, ${isAuto})`;
    // Auto-snapshots: max 15, delete oldest. User snapshots: unlimited
    const autoCount = await sql`SELECT COUNT(*) as cnt FROM snapshots WHERE whiteboard_id = ${whiteboardId} AND is_auto = true`;
    if (autoCount.rows[0].cnt > 15) {
      await sql`DELETE FROM snapshots WHERE id IN (SELECT id FROM snapshots WHERE whiteboard_id = ${whiteboardId} AND is_auto = true ORDER BY created_at ASC LIMIT ${autoCount.rows[0].cnt - 15})`;
    }
    return { id: snapId, name, timestamp: now };
  }

  async getSnapshots(whiteboardId: string): Promise<{ id: string; name: string; timestamp: number; createdBy: string; isAuto: boolean }[]> {
    await this.ensureReady();
    const result = await sql`SELECT id, name, created_at, created_by, is_auto FROM snapshots WHERE whiteboard_id = ${whiteboardId} ORDER BY created_at DESC`;
    return result.rows.map((r: any) => ({ id: r.id, name: r.name, timestamp: r.created_at, createdBy: r.created_by, isAuto: r.is_auto }));
  }

  async loadSnapshot(whiteboardId: string, snapshotId: string): Promise<DrawAction[] | null> {
    await this.ensureReady();
    const result = await sql`SELECT actions_data FROM snapshots WHERE id = ${snapshotId} AND whiteboard_id = ${whiteboardId}`;
    if (result.rows.length === 0) return null;
    const data = result.rows[0].actions_data;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  async deleteSnapshot(whiteboardId: string, snapshotId: string): Promise<void> {
    await this.ensureReady();
    await sql`DELETE FROM snapshots WHERE id = ${snapshotId} AND whiteboard_id = ${whiteboardId}`;
  }

  // Broadcast messages
  async getBroadcasts(whiteboardId: string, since: number = 0): Promise<{ message: string; timestamp: number }[]> {
    await this.ensureReady();
    const result = await sql`SELECT message, created_at FROM broadcasts WHERE whiteboard_id = ${whiteboardId} AND created_at > ${since} ORDER BY created_at`;
    return result.rows.map((r: any) => ({ message: r.message, timestamp: r.created_at }));
  }

  async addBroadcast(whiteboardId: string, message: string): Promise<void> {
    await this.ensureReady();
    await sql`INSERT INTO broadcasts (whiteboard_id, message, created_at) VALUES (${whiteboardId}, ${message}, ${Date.now()})`;
  }

  // Participant heartbeat
  async heartbeat(whiteboardId: string, userId: string, nickname: string, color: string): Promise<void> {
    await this.ensureReady();
    const now = Date.now();
    await sql`INSERT INTO active_users (whiteboard_id, user_id, nickname, color, last_seen) VALUES (${whiteboardId}, ${userId}, ${nickname}, ${color}, ${now}) ON CONFLICT (whiteboard_id, user_id) DO UPDATE SET nickname = ${nickname}, color = ${color}, last_seen = ${now}`;
  }

  async getActiveUsers(whiteboardId: string): Promise<{ userId: string; nickname: string; color: string }[]> {
    await this.ensureReady();
    const TIMEOUT = 10000;
    const result = await sql`SELECT user_id, nickname, color FROM active_users WHERE whiteboard_id = ${whiteboardId} AND last_seen > ${Date.now() - TIMEOUT}`;
    return result.rows.map((r: any) => ({ userId: r.user_id, nickname: r.nickname, color: r.color }));
  }

  // List all whiteboards (admin)
  async listWhiteboards(): Promise<{ id: string; name: string; createdAt: number; actionCount: number }[]> {
    await this.ensureReady();
    const result = await sql`SELECT w.id, w.name, w.created_at, COUNT(a.id) as action_count FROM whiteboards w LEFT JOIN actions a ON a.whiteboard_id = w.id GROUP BY w.id ORDER BY w.created_at DESC`;
    return result.rows.map((r: any) => ({ id: r.id, name: r.name, createdAt: r.created_at, actionCount: parseInt(r.action_count) || 0 }));
  }

  // Admin password (PostgreSQL)
  async getAdminPassword(): Promise<{ hash: string; salt: string } | null> {
    await this.ensureReady();
    try {
      const result = await sql`SELECT hash, salt FROM admin_config WHERE id = 'admin'`;
      if (result.rows.length === 0) return null;
      return { hash: result.rows[0].hash, salt: result.rows[0].salt };
    } catch {
      // Tablo yoksa null don
      return null;
    }
  }

  async setAdminPassword(hash: string, salt: string): Promise<void> {
    await this.ensureReady();
    await sql`INSERT INTO admin_config (id, hash, salt) VALUES ('admin', ${hash}, ${salt}) ON CONFLICT (id) DO UPDATE SET hash = ${hash}, salt = ${salt}`;
  }
}

// ===== Store export =====
const globalStore = globalThis as any;
if (!globalStore.__whiteboardStore) {
  globalStore.__whiteboardStore = hasDb ? new PostgresStore() : new InMemoryStore();
}

export const whiteboardStore: InMemoryStore | PostgresStore = globalStore.__whiteboardStore;
