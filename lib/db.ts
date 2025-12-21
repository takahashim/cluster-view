import { nanoid } from "nanoid";
import type { HierarchicalResult, ReportRecord } from "./types.ts";

// In-memory storage for development (Vite dev mode)
const memoryStore = new Map<string, unknown>();

// Check if Deno KV is available
function isDenoKvAvailable(): boolean {
  return typeof Deno !== "undefined" && typeof Deno.openKv === "function";
}

// Get Deno KV instance
let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv | null> {
  if (!isDenoKvAvailable()) {
    return null;
  }
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

function extractTitle(config: Record<string, unknown>): string | undefined {
  const question = config.question;
  if (typeof question === "string" && question.trim()) {
    return question.trim();
  }
  return undefined;
}

// Create a new report
export async function createReport(
  data: HierarchicalResult,
): Promise<ReportRecord> {
  const id = crypto.randomUUID();
  const shareToken = nanoid(21);
  const title = extractTitle(data.config);

  const record: ReportRecord = {
    id,
    shareToken,
    ownerId: null,
    data,
    createdAt: new Date().toISOString(),
    title,
    shareEnabled: true,
  };

  const db = await getKv();

  if (db) {
    // Use Deno KV
    const result = await db
      .atomic()
      .set(["reports", id], record)
      .set(["share_tokens", shareToken], id)
      .commit();

    if (!result.ok) {
      throw new Error("Failed to create report");
    }
  } else {
    // Use in-memory storage (development)
    memoryStore.set(`reports:${id}`, record);
    memoryStore.set(`share_tokens:${shareToken}`, id);
    console.log("[Dev] Report saved to memory:", shareToken);
  }

  return record;
}

// Get report by ID
export async function getReportById(
  id: string,
): Promise<ReportRecord | null> {
  const db = await getKv();

  if (db) {
    const result = await db.get<ReportRecord>(["reports", id]);
    return result.value;
  } else {
    return (memoryStore.get(`reports:${id}`) as ReportRecord) || null;
  }
}

// Get report by share token
export async function getReportByToken(
  token: string,
): Promise<ReportRecord | null> {
  const db = await getKv();

  if (db) {
    const idResult = await db.get<string>(["share_tokens", token]);
    if (!idResult.value) {
      return null;
    }
    const reportResult = await db.get<ReportRecord>([
      "reports",
      idResult.value,
    ]);
    return reportResult.value;
  } else {
    const id = memoryStore.get(`share_tokens:${token}`) as string;
    if (!id) {
      return null;
    }
    return (memoryStore.get(`reports:${id}`) as ReportRecord) || null;
  }
}

// Update share enabled status
export async function updateShareEnabled(
  id: string,
  enabled: boolean,
): Promise<boolean> {
  const db = await getKv();

  if (db) {
    const result = await db.get<ReportRecord>(["reports", id]);
    if (!result.value) {
      return false;
    }

    const updated: ReportRecord = {
      ...result.value,
      shareEnabled: enabled,
    };

    const updateResult = await db.set(["reports", id], updated);
    return updateResult.ok;
  } else {
    const record = memoryStore.get(`reports:${id}`) as ReportRecord;
    if (!record) {
      return false;
    }
    record.shareEnabled = enabled;
    memoryStore.set(`reports:${id}`, record);
    return true;
  }
}

// Regenerate share token (invalidates old URL)
export async function regenerateShareToken(
  id: string,
): Promise<string | null> {
  const db = await getKv();

  if (db) {
    const result = await db.get<ReportRecord>(["reports", id]);
    if (!result.value) {
      return null;
    }

    const oldToken = result.value.shareToken;
    const newToken = nanoid(21);

    const updated: ReportRecord = {
      ...result.value,
      shareToken: newToken,
    };

    const updateResult = await db
      .atomic()
      .delete(["share_tokens", oldToken])
      .set(["share_tokens", newToken], id)
      .set(["reports", id], updated)
      .commit();

    if (!updateResult.ok) {
      return null;
    }

    return newToken;
  } else {
    const record = memoryStore.get(`reports:${id}`) as ReportRecord;
    if (!record) {
      return null;
    }

    const oldToken = record.shareToken;
    const newToken = nanoid(21);

    record.shareToken = newToken;
    memoryStore.delete(`share_tokens:${oldToken}`);
    memoryStore.set(`share_tokens:${newToken}`, id);
    memoryStore.set(`reports:${id}`, record);

    return newToken;
  }
}

// Delete report
export async function deleteReport(id: string): Promise<boolean> {
  const db = await getKv();

  if (db) {
    const result = await db.get<ReportRecord>(["reports", id]);
    if (!result.value) {
      return false;
    }

    const token = result.value.shareToken;

    const deleteResult = await db
      .atomic()
      .delete(["reports", id])
      .delete(["share_tokens", token])
      .commit();

    return deleteResult.ok;
  } else {
    const record = memoryStore.get(`reports:${id}`) as ReportRecord;
    if (!record) {
      return false;
    }

    memoryStore.delete(`reports:${id}`);
    memoryStore.delete(`share_tokens:${record.shareToken}`);
    return true;
  }
}
