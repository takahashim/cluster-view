import { type Client, createClient } from "@libsql/client/web";
import type { HierarchicalResult, ReportRecord, UserRecord } from "./types.ts";
import { getEnv } from "./env.ts";

// Session expiry: 7 days (shared constant)
export const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface Store {
  // Report methods
  getRecord(id: string): Promise<ReportRecord | null>;
  getReportByToken(token: string): Promise<ReportRecord | null>;
  saveRecord(record: ReportRecord): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  getReportsByOwner(ownerId: string): Promise<ReportRecord[]>;
  getAllReports(): Promise<ReportRecord[]>;

  // User methods
  getUser(userId: string): Promise<UserRecord | null>;
  saveUser(record: UserRecord): Promise<void>;

  // Session methods
  getSession(sessionId: string): Promise<string | null>;
  saveSession(sessionId: string, userId: string): Promise<void>;

  // Initialize schema (for Turso)
  initSchema?(): Promise<void>;
}

export class MemoryStore implements Store {
  private data = new Map<string, unknown>();
  private sessions = new Map<string, { userId: string; expiresAt: number }>();

  getRecord(id: string): Promise<ReportRecord | null> {
    const record = this.data.get(`reports:${id}`) as ReportRecord | undefined;
    return Promise.resolve(record ?? null);
  }

  getReportByToken(token: string): Promise<ReportRecord | null> {
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith("reports:")) {
        const record = value as ReportRecord;
        if (record.shareToken === token) {
          return Promise.resolve(record);
        }
      }
    }
    return Promise.resolve(null);
  }

  saveRecord(record: ReportRecord): Promise<void> {
    this.data.set(`reports:${record.id}`, record);
    return Promise.resolve();
  }

  deleteRecord(id: string): Promise<void> {
    this.data.delete(`reports:${id}`);
    return Promise.resolve();
  }

  getReportsByOwner(ownerId: string): Promise<ReportRecord[]> {
    const reports: ReportRecord[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith("reports:")) {
        const record = value as ReportRecord;
        if (record.ownerId === ownerId) {
          reports.push(record);
        }
      }
    }
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return Promise.resolve(reports);
  }

  getAllReports(): Promise<ReportRecord[]> {
    const reports: ReportRecord[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith("reports:")) {
        reports.push(value as ReportRecord);
      }
    }
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return Promise.resolve(reports);
  }

  getUser(userId: string): Promise<UserRecord | null> {
    const record = this.data.get(`users:${userId}`) as UserRecord | undefined;
    return Promise.resolve(record ?? null);
  }

  saveUser(record: UserRecord): Promise<void> {
    this.data.set(`users:${record.id}`, record);
    return Promise.resolve();
  }

  getSession(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return Promise.resolve(null);
    // Check expiry
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return Promise.resolve(null);
    }
    return Promise.resolve(session.userId);
  }

  saveSession(sessionId: string, userId: string): Promise<void> {
    this.sessions.set(sessionId, {
      userId,
      expiresAt: Date.now() + SESSION_EXPIRY_MS,
    });
    return Promise.resolve();
  }
}

// Global Turso client instance
let tursoClient: Client | null = null;

function getTursoClient(): Client {
  if (!tursoClient) {
    const url = getEnv("TURSO_DATABASE_URL");
    const authToken = getEnv("TURSO_AUTH_TOKEN");

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
    includeData = true,
  ): ReportRecord {
    return {
      id: row.id as string,
      shareToken: row.share_token as string,
      ownerId: row.owner_id as string,
      data: includeData && row.data
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
    if (result.rows.length === 0) return null;
    return this.parseReportRecord(
      result.rows[0] as unknown as Record<string, unknown>,
    );
  }

  async getReportByToken(token: string): Promise<ReportRecord | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM reports WHERE share_token = ?",
      args: [token],
    });
    if (result.rows.length === 0) return null;
    return this.parseReportRecord(
      result.rows[0] as unknown as Record<string, unknown>,
    );
  }

  async saveRecord(record: ReportRecord): Promise<void> {
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
  }

  async deleteRecord(id: string): Promise<void> {
    await this.db.execute({
      sql: "DELETE FROM reports WHERE id = ?",
      args: [id],
    });
  }

  async getReportsByOwner(ownerId: string): Promise<ReportRecord[]> {
    const result = await this.db.execute({
      sql: "SELECT * FROM reports WHERE owner_id = ? ORDER BY created_at DESC",
      args: [ownerId],
    });
    return result.rows.map((row) =>
      this.parseReportRecord(row as unknown as Record<string, unknown>)
    );
  }

  async getAllReports(): Promise<ReportRecord[]> {
    // Exclude data for performance (admin list view)
    const result = await this.db.execute(
      "SELECT id, share_token, owner_id, created_at, title, share_enabled, comment_count FROM reports ORDER BY created_at DESC",
    );
    return result.rows.map((row) =>
      this.parseReportRecord(row as unknown as Record<string, unknown>, false)
    );
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [userId],
    });
    if (result.rows.length === 0) return null;
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

  async saveUser(record: UserRecord): Promise<void> {
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
  }

  async getSession(sessionId: string): Promise<string | null> {
    const result = await this.db.execute({
      sql: "SELECT user_id, expires_at FROM sessions WHERE session_id = ?",
      args: [sessionId],
    });
    if (result.rows.length === 0) return null;

    const row = result.rows[0] as unknown as Record<string, unknown>;
    const expiresAt = new Date(row.expires_at as string).getTime();

    // Check expiry
    if (Date.now() > expiresAt) {
      // Clean up expired session
      await this.db.execute({
        sql: "DELETE FROM sessions WHERE session_id = ?",
        args: [sessionId],
      });
      return null;
    }

    return row.user_id as string;
  }

  async saveSession(sessionId: string, userId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
    await this.db.execute({
      sql: `INSERT OR REPLACE INTO sessions (session_id, user_id, expires_at)
            VALUES (?, ?, ?)`,
      args: [sessionId, userId, expiresAt],
    });
  }
}

function isTursoConfigured(): boolean {
  return !!getEnv("TURSO_DATABASE_URL");
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
