import type { ReportRecord } from "./types.ts";

export interface Store {
  getRecord(id: string): Promise<ReportRecord | null>;
  getReportIdByToken(token: string): Promise<string | null>;
  saveRecord(record: ReportRecord): Promise<boolean>;
  deleteRecord(id: string): Promise<boolean>;
  saveTokenIndex(token: string, id: string): Promise<boolean>;
  deleteTokenIndex(token: string): Promise<boolean>;
  atomicSaveRecordWithToken(
    record: ReportRecord,
    token: string,
  ): Promise<boolean>;
  atomicDeleteRecordWithToken(id: string, token: string): Promise<boolean>;
  atomicUpdateToken(
    id: string,
    oldToken: string,
    newToken: string,
    record: ReportRecord,
  ): Promise<boolean>;
}

class MemoryStore implements Store {
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
  ): Promise<boolean> {
    this.data.set(`reports:${record.id}`, record);
    this.data.set(`share_tokens:${token}`, record.id);
    console.log("[Dev] Report saved to memory:", token);
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
}

class DenoKvStore implements Store {
  private kv: Deno.Kv | null = null;

  private async getKv(): Promise<Deno.Kv> {
    if (!this.kv) {
      this.kv = await Deno.openKv();
    }
    return this.kv;
  }

  async getRecord(id: string): Promise<ReportRecord | null> {
    const kv = await this.getKv();
    const result = await kv.get<ReportRecord>(["reports", id]);
    return result.value;
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
  ): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv
      .atomic()
      .set(["reports", record.id], record)
      .set(["share_tokens", token], record.id)
      .commit();
    return result.ok;
  }

  async atomicDeleteRecordWithToken(
    id: string,
    token: string,
  ): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv
      .atomic()
      .delete(["reports", id])
      .delete(["share_tokens", token])
      .commit();
    return result.ok;
  }

  async atomicUpdateToken(
    id: string,
    oldToken: string,
    newToken: string,
    record: ReportRecord,
  ): Promise<boolean> {
    const kv = await this.getKv();
    const result = await kv
      .atomic()
      .delete(["share_tokens", oldToken])
      .set(["share_tokens", newToken], id)
      .set(["reports", id], record)
      .commit();
    return result.ok;
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
