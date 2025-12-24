import { type Client, createClient } from "@libsql/client";
import type { HierarchicalResult, ReportRecord, UserRecord } from "./types.ts";

export interface Store {
  // Report methods
  getRecord(id: string): Promise<ReportRecord | null>;
  getReportIdByToken(token: string): Promise<string | null>;
  saveRecord(record: ReportRecord): Promise<boolean>;
  deleteRecord(id: string): Promise<boolean>;
  saveTokenIndex(token: string, id: string): Promise<boolean>;
  deleteTokenIndex(token: string): Promise<boolean>;
  atomicSaveRecordWithToken(
    record: ReportRecord,
    token: string,
    ownerId: string,
  ): Promise<boolean>;
  atomicDeleteRecordWithToken(id: string, token: string): Promise<boolean>;
  atomicUpdateToken(
    id: string,
    oldToken: string,
    newToken: string,
    record: ReportRecord,
  ): Promise<boolean>;

  // User methods
  getUserRecord(userId: string): Promise<UserRecord | null>;
  saveUserRecord(record: UserRecord): Promise<boolean>;
  getReportRecordsByOwner(ownerId: string): Promise<ReportRecord[]>;

  // Session methods
  getSessionUserId(sessionId: string): Promise<string | null>;
  saveSessionUserId(sessionId: string, userId: string): Promise<boolean>;

  // User-Report index methods
  addUserReportIndex(userId: string, reportId: string): Promise<boolean>;
  removeUserReportIndex(userId: string, reportId: string): Promise<boolean>;

  // Admin methods
  getAllReportRecords(): Promise<ReportRecord[]>;

  // Initialize schema (for Turso)
  initSchema?(): Promise<void>;
}

export class MemoryStore implements Store {
  private data = new Map<string, unknown>();

  getRecord(id: string): Promise<ReportRecord | null> {
    const record = this.data.get(`reports:${id}`) as ReportRecord | undefined;
    return Promise.resolve(record ?? null);
  }

  getReportIdByToken(token: string): Promise<string | null> {
    const id = this.data.get(`share_tokens:${token}`) as string | undefined;
    return Promise.resolve(id ?? null);
  }

  saveRecord(record: ReportRecord): Promise<boolean> {
    this.data.set(`reports:${record.id}`, record);
    return Promise.resolve(true);
  }

  deleteRecord(id: string): Promise<boolean> {
    this.data.delete(`reports:${id}`);
    return Promise.resolve(true);
  }

  saveTokenIndex(token: string, id: string): Promise<boolean> {
    this.data.set(`share_tokens:${token}`, id);
    return Promise.resolve(true);
  }

  deleteTokenIndex(token: string): Promise<boolean> {
    this.data.delete(`share_tokens:${token}`);
    return Promise.resolve(true);
  }

  atomicSaveRecordWithToken(
    record: ReportRecord,
    token: string,
    ownerId: string,
  ): Promise<boolean> {
    this.data.set(`reports:${record.id}`, record);
    this.data.set(`share_tokens:${token}`, record.id);
    this.data.set(`user_reports:${ownerId}:${record.id}`, true);
    return Promise.resolve(true);
  }

  atomicDeleteRecordWithToken(id: string, token: string): Promise<boolean> {
    this.data.delete(`reports:${id}`);
    this.data.delete(`share_tokens:${token}`);
    return Promise.resolve(true);
  }

  atomicUpdateToken(
    id: string,
    oldToken: string,
    newToken: string,
    record: ReportRecord,
  ): Promise<boolean> {
    this.data.delete(`share_tokens:${oldToken}`);
    this.data.set(`share_tokens:${newToken}`, id);
    this.data.set(`reports:${id}`, record);
    return Promise.resolve(true);
  }

  // User methods
  getUserRecord(userId: string): Promise<UserRecord | null> {
    const record = this.data.get(`users:${userId}`) as UserRecord | undefined;
    return Promise.resolve(record ?? null);
  }

  saveUserRecord(record: UserRecord): Promise<boolean> {
    this.data.set(`users:${record.id}`, record);
    return Promise.resolve(true);
  }

  getReportRecordsByOwner(ownerId: string): Promise<ReportRecord[]> {
    const reports: ReportRecord[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith("reports:")) {
        const record = value as ReportRecord;
        if (record.ownerId === ownerId) {
          reports.push(record);
        }
      }
    }
    // Sort by createdAt descending
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return Promise.resolve(reports);
  }

  // Session methods
  getSessionUserId(sessionId: string): Promise<string | null> {
    const userId = this.data.get(`sessions:${sessionId}`) as string | undefined;
    return Promise.resolve(userId ?? null);
  }

  saveSessionUserId(sessionId: string, userId: string): Promise<boolean> {
    this.data.set(`sessions:${sessionId}`, userId);
    return Promise.resolve(true);
  }

  // User-Report index methods
  addUserReportIndex(userId: string, reportId: string): Promise<boolean> {
    this.data.set(`user_reports:${userId}:${reportId}`, true);
    return Promise.resolve(true);
  }

  removeUserReportIndex(userId: string, reportId: string): Promise<boolean> {
    this.data.delete(`user_reports:${userId}:${reportId}`);
    return Promise.resolve(true);
  }

  // Admin methods
  getAllReportRecords(): Promise<ReportRecord[]> {
    const reports: ReportRecord[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith("reports:")) {
        reports.push(value as ReportRecord);
      }
    }
    // Sort by createdAt descending
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return Promise.resolve(reports);
  }
}

// Global Turso client instance
let tursoClient: Client | null = null;

function getTursoClient(): Client {
  if (!tursoClient) {
    const url = Deno.env.get("TURSO_DATABASE_URL");
    const authToken = Deno.env.get("TURSO_AUTH_TOKEN");

    if (!url) {
      throw new Error("TURSO_DATABASE_URL environment variable is required");
    }

    tursoClient = createClient({
      url,
      authToken,
    });
  }
  return tursoClient;
}

class TursoStore implements Store {
  private get db(): Client {
    return getTursoClient();
  }

  async initSchema(): Promise<void> {
    await this.db.batch([
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        share_token TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL,
        title TEXT,
        share_enabled INTEGER DEFAULT 1,
        comment_count INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        picture TEXT,
        created_at TEXT NOT NULL,
        last_login_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON reports(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reports_share_token ON reports(share_token)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
    ]);
  }

  private parseReportRecord(
    row: Record<string, unknown>,
  ): ReportRecord {
    return {
      id: row.id as string,
      shareToken: row.share_token as string,
      ownerId: row.owner_id as string,
      data: row.data
        ? JSON.parse(row.data as string) as HierarchicalResult
        : undefined,
      createdAt: row.created_at as string,
      title: row.title as string | undefined,
      shareEnabled: row.share_enabled === 1,
      commentCount: row.comment_count as number | undefined,
    };
  }

  async getRecord(id: string): Promise<ReportRecord | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM reports WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseReportRecord(
      result.rows[0] as unknown as Record<string, unknown>,
    );
  }

  async getReportIdByToken(token: string): Promise<string | null> {
    const result = await this.db.execute({
      sql: "SELECT id FROM reports WHERE share_token = ?",
      args: [token],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id as string;
  }

  async saveRecord(record: ReportRecord): Promise<boolean> {
    await this.db.execute({
      sql: `INSERT OR REPLACE INTO reports
            (id, share_token, owner_id, data, created_at, title, share_enabled, comment_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.shareToken,
        record.ownerId,
        record.data ? JSON.stringify(record.data) : null,
        record.createdAt,
        record.title ?? null,
        record.shareEnabled ? 1 : 0,
        record.commentCount ?? 0,
      ],
    });
    return true;
  }

  async deleteRecord(id: string): Promise<boolean> {
    await this.db.execute({
      sql: "DELETE FROM reports WHERE id = ?",
      args: [id],
    });
    return true;
  }

  async saveTokenIndex(_token: string, _id: string): Promise<boolean> {
    // Token is stored in reports table, no separate index needed
    return true;
  }

  async deleteTokenIndex(_token: string): Promise<boolean> {
    // Token is stored in reports table, no separate index needed
    return true;
  }

  async atomicSaveRecordWithToken(
    record: ReportRecord,
    _token: string,
    _ownerId: string,
  ): Promise<boolean> {
    // In Turso, we can use a transaction for atomicity
    // Token is part of the record, owner_id is also in the record
    await this.db.execute({
      sql: `INSERT OR REPLACE INTO reports
            (id, share_token, owner_id, data, created_at, title, share_enabled, comment_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.shareToken,
        record.ownerId,
        record.data ? JSON.stringify(record.data) : null,
        record.createdAt,
        record.title ?? null,
        record.shareEnabled ? 1 : 0,
        record.commentCount ?? 0,
      ],
    });
    return true;
  }

  async atomicDeleteRecordWithToken(
    id: string,
    _token: string,
  ): Promise<boolean> {
    await this.db.execute({
      sql: "DELETE FROM reports WHERE id = ?",
      args: [id],
    });
    return true;
  }

  async atomicUpdateToken(
    id: string,
    _oldToken: string,
    newToken: string,
    record: ReportRecord,
  ): Promise<boolean> {
    await this.db.execute({
      sql: `UPDATE reports SET share_token = ?, title = ?, share_enabled = ?
            WHERE id = ?`,
      args: [
        newToken,
        record.title ?? null,
        record.shareEnabled ? 1 : 0,
        id,
      ],
    });
    return true;
  }

  // User methods
  async getUserRecord(userId: string): Promise<UserRecord | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [userId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as unknown as Record<string, unknown>;
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      picture: row.picture as string | undefined,
      createdAt: row.created_at as string,
      lastLoginAt: row.last_login_at as string,
    };
  }

  async saveUserRecord(record: UserRecord): Promise<boolean> {
    await this.db.execute({
      sql: `INSERT OR REPLACE INTO users
            (id, email, name, picture, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.email,
        record.name,
        record.picture ?? null,
        record.createdAt,
        record.lastLoginAt,
      ],
    });
    return true;
  }

  async getReportRecordsByOwner(ownerId: string): Promise<ReportRecord[]> {
    const result = await this.db.execute({
      sql: "SELECT * FROM reports WHERE owner_id = ? ORDER BY created_at DESC",
      args: [ownerId],
    });

    return result.rows.map((row) =>
      this.parseReportRecord(row as unknown as Record<string, unknown>)
    );
  }

  // Session methods
  async getSessionUserId(sessionId: string): Promise<string | null> {
    const result = await this.db.execute({
      sql: "SELECT user_id FROM sessions WHERE session_id = ?",
      args: [sessionId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].user_id as string;
  }

  async saveSessionUserId(sessionId: string, userId: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString(); // 7 days
    await this.db.execute({
      sql: `INSERT OR REPLACE INTO sessions (session_id, user_id, expires_at)
            VALUES (?, ?, ?)`,
      args: [sessionId, userId, expiresAt],
    });
    return true;
  }

  // User-Report index methods (not needed in SQL - we use owner_id column)
  async addUserReportIndex(
    _userId: string,
    _reportId: string,
  ): Promise<boolean> {
    // Not needed - owner_id is stored in reports table
    return true;
  }

  async removeUserReportIndex(
    _userId: string,
    _reportId: string,
  ): Promise<boolean> {
    // Not needed - reports are deleted directly
    return true;
  }

  // Admin methods
  async getAllReportRecords(): Promise<ReportRecord[]> {
    const result = await this.db.execute(
      "SELECT id, share_token, owner_id, created_at, title, share_enabled, comment_count FROM reports ORDER BY created_at DESC",
    );

    return result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as string,
        shareToken: r.share_token as string,
        ownerId: r.owner_id as string,
        createdAt: r.created_at as string,
        title: r.title as string | undefined,
        shareEnabled: r.share_enabled === 1,
        commentCount: r.comment_count as number | undefined,
      };
    });
  }
}

function isTursoConfigured(): boolean {
  return !!Deno.env.get("TURSO_DATABASE_URL");
}

let storeInstance: Store | null = null;
let schemaInitialized = false;

export function getStore(): Store {
  if (!storeInstance) {
    if (isTursoConfigured()) {
      storeInstance = new TursoStore();
    } else {
      console.warn(
        "TURSO_DATABASE_URL not set, using MemoryStore (data will not persist)",
      );
      storeInstance = new MemoryStore();
    }
  }
  return storeInstance;
}

// Initialize schema on first use
export async function initializeStore(): Promise<void> {
  if (schemaInitialized) return;

  const store = getStore();
  if (store.initSchema) {
    await store.initSchema();
  }
  schemaInitialized = true;
}
