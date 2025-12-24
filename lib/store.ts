import type { HierarchicalResult, ReportRecord, UserRecord } from "./types.ts";
import { DEFAULT_CHUNK_SIZE, joinChunks, splitIntoChunks } from "./chunk.ts";

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

  // Debug method (temporary)
  getKvInstance?(): Promise<Deno.Kv | null>;
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

// Global KV instance to ensure consistency across all code paths
let globalKv: Deno.Kv | null = null;

async function getGlobalKv(): Promise<Deno.Kv> {
  if (!globalKv) {
    globalKv = await Deno.openKv();
  }
  return globalKv;
}

class DenoKvStore implements Store {
  private async getKv(): Promise<Deno.Kv> {
    return await getGlobalKv();
  }

  // Debug method (temporary)
  async getKvInstance(): Promise<Deno.Kv | null> {
    return await this.getKv();
  }

  // Save data chunks to KV
  private async saveDataChunks(
    id: string,
    data: HierarchicalResult,
  ): Promise<number> {
    const kv = await this.getKv();
    const jsonStr = JSON.stringify(data);
    const chunks = splitIntoChunks(jsonStr, DEFAULT_CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      await kv.set(["report_data", id, i], chunks[i]);
    }

    return chunks.length;
  }

  // Load and join data chunks from KV
  private async loadDataChunks(
    id: string,
    chunkCount: number,
  ): Promise<HierarchicalResult | null> {
    const kv = await this.getKv();

    // Build keys for all chunks
    const keys: Deno.KvKey[] = [];
    for (let i = 0; i < chunkCount; i++) {
      keys.push(["report_data", id, i]);
    }

    // Fetch all chunks in parallel
    const results = await kv.getMany<string[]>(keys);
    const chunks: string[] = [];

    for (const result of results) {
      if (result.value === null) {
        return null; // Missing chunk
      }
      chunks.push(result.value);
    }

    // Join and parse
    const jsonStr = joinChunks(chunks);
    return JSON.parse(jsonStr);
  }

  // Delete all data chunks
  private async deleteDataChunks(
    id: string,
    chunkCount: number,
  ): Promise<void> {
    const kv = await this.getKv();

    for (let i = 0; i < chunkCount; i++) {
      await kv.delete(["report_data", id, i]);
    }
  }

  async getRecord(id: string): Promise<ReportRecord | null> {
    const kv = await this.getKv();
    const result = await kv.get<ReportRecord>(["reports", id]);
    if (!result.value) return null;

    const record = result.value;

    // Load data from chunks if dataChunks exists
    if (record.dataChunks && !record.data) {
      const data = await this.loadDataChunks(id, record.dataChunks);
      if (data) {
        record.data = data;
      }
    }

    return record;
  }

  async getReportIdByToken(token: string): Promise<string | null> {
    const kv = await this.getKv();
    const result = await kv.get<string>(["share_tokens", token]);
    return result.value;
  }

  async saveRecord(record: ReportRecord): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv.set(["reports", record.id], record);
    return result.ok;
  }

  async deleteRecord(id: string): Promise<boolean> {
    const kv = await this.getKv();
    await kv.delete(["reports", id]);
    return true;
  }

  async saveTokenIndex(token: string, id: string): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv.set(["share_tokens", token], id);
    return result.ok;
  }

  async deleteTokenIndex(token: string): Promise<boolean> {
    const kv = await this.getKv();
    await kv.delete(["share_tokens", token]);
    return true;
  }

  async atomicSaveRecordWithToken(
    record: ReportRecord,
    token: string,
    ownerId: string,
  ): Promise<boolean> {
    const kv = await this.getKv();

    // Save data as chunks and store only metadata in main record
    let kvRecord: ReportRecord;
    if (record.data) {
      const dataChunks = await this.saveDataChunks(record.id, record.data);
      kvRecord = { ...record, data: undefined, dataChunks };
    } else {
      kvRecord = record;
    }

    // Use atomic transaction for metadata, token index, and user index
    const result = await kv.atomic()
      .set(["reports", record.id], kvRecord)
      .set(["share_tokens", token], record.id)
      .set(["user_reports", ownerId, record.id], true)
      .commit();

    return result.ok;
  }

  async atomicDeleteRecordWithToken(
    id: string,
    token: string,
  ): Promise<boolean> {
    const kv = await this.getKv();

    // Get record to find chunk count
    const result = await kv.get<ReportRecord>(["reports", id]);
    if (result.value?.dataChunks) {
      await this.deleteDataChunks(id, result.value.dataChunks);
    }

    // Delete metadata and token index
    await kv.delete(["reports", id]);
    await kv.delete(["share_tokens", token]);

    return true;
  }

  async atomicUpdateToken(
    id: string,
    oldToken: string,
    newToken: string,
    record: ReportRecord,
  ): Promise<boolean> {
    const kv = await this.getKv();

    await kv.delete(["share_tokens", oldToken]);
    await kv.set(["share_tokens", newToken], id);
    await kv.set(["reports", id], record);

    return true;
  }

  // User methods
  async getUserRecord(userId: string): Promise<UserRecord | null> {
    const kv = await this.getKv();
    const result = await kv.get<UserRecord>(["users", userId]);
    return result.value;
  }

  async saveUserRecord(record: UserRecord): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv.set(["users", record.id], record);
    return result.ok;
  }

  async getReportRecordsByOwner(ownerId: string): Promise<ReportRecord[]> {
    const kv = await this.getKv();
    const reports: ReportRecord[] = [];

    // Use user_reports index to get report IDs
    const iter = kv.list<boolean>({ prefix: ["user_reports", ownerId] });
    for await (const entry of iter) {
      const reportId = entry.key[2] as string;
      // Use getRecord to properly load data from chunks
      const record = await this.getRecord(reportId);
      if (record) {
        reports.push(record);
      }
    }

    // Sort by createdAt descending
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return reports;
  }

  // Session methods
  async getSessionUserId(sessionId: string): Promise<string | null> {
    const kv = await this.getKv();
    const result = await kv.get<string>(["sessions", sessionId]);
    return result.value;
  }

  async saveSessionUserId(sessionId: string, userId: string): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv.set(["sessions", sessionId], userId);
    return result.ok;
  }

  // User-Report index methods
  async addUserReportIndex(
    userId: string,
    reportId: string,
  ): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv.set(["user_reports", userId, reportId], true);
    return result.ok;
  }

  async removeUserReportIndex(
    userId: string,
    reportId: string,
  ): Promise<boolean> {
    const kv = await this.getKv();
    await kv.delete(["user_reports", userId, reportId]);
    return true;
  }

  // Admin methods
  async getAllReportRecords(): Promise<ReportRecord[]> {
    const kv = await this.getKv();
    const reports: ReportRecord[] = [];

    // List all reports (metadata only, without loading data chunks)
    const iter = kv.list<ReportRecord>({ prefix: ["reports"] });
    for await (const entry of iter) {
      reports.push(entry.value);
    }

    // Sort by createdAt descending
    reports.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return reports;
  }
}

function isDenoKvAvailable(): boolean {
  return typeof Deno !== "undefined" && typeof Deno.openKv === "function";
}

let storeInstance: Store | null = null;

export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = isDenoKvAvailable() ? new DenoKvStore() : new MemoryStore();
  }
  return storeInstance;
}
