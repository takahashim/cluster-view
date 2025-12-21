import { nanoid } from "nanoid";
import type { HierarchicalResult, ReportRecord } from "./types.ts";

// Get Deno KV instance
let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
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
  const db = await getKv();

  const id = crypto.randomUUID();
  const shareToken = nanoid(21);
  const title = extractTitle(data.config);

  const record: ReportRecord = {
    id,
    shareToken,
    ownerId: null, // Will be set when auth is implemented
    data,
    createdAt: new Date().toISOString(),
    title,
    shareEnabled: true,
  };

  // Use atomic transaction to ensure consistency
  const result = await db
    .atomic()
    .set(["reports", id], record)
    .set(["share_tokens", shareToken], id)
    .commit();

  if (!result.ok) {
    throw new Error("Failed to create report");
  }

  return record;
}

// Get report by ID
export async function getReportById(
  id: string,
): Promise<ReportRecord | null> {
  const db = await getKv();
  const result = await db.get<ReportRecord>(["reports", id]);
  return result.value;
}

// Get report by share token
export async function getReportByToken(
  token: string,
): Promise<ReportRecord | null> {
  const db = await getKv();

  // First, get the ID from the token index
  const idResult = await db.get<string>(["share_tokens", token]);
  if (!idResult.value) {
    return null;
  }

  // Then, get the report by ID
  const reportResult = await db.get<ReportRecord>(["reports", idResult.value]);
  return reportResult.value;
}

// Update share enabled status
export async function updateShareEnabled(
  id: string,
  enabled: boolean,
): Promise<boolean> {
  const db = await getKv();

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
}

// Regenerate share token (invalidates old URL)
export async function regenerateShareToken(
  id: string,
): Promise<string | null> {
  const db = await getKv();

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

  // Atomic: delete old token index, add new one, update report
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
}

// Delete report
export async function deleteReport(id: string): Promise<boolean> {
  const db = await getKv();

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
}
