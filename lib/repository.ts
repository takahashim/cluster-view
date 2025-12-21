import { nanoid } from "nanoid";
import type { HierarchicalResult, Report, ReportRecord } from "./types.ts";
import { getStore } from "./store.ts";

const DEFAULT_TITLE = "分析結果";

function extractTitle(config: Record<string, unknown>): string | undefined {
  const question = config.question;
  if (typeof question === "string" && question.trim()) {
    return question.trim();
  }
  return undefined;
}

function toReport(record: ReportRecord): Report {
  return {
    id: record.id,
    title: record.title || DEFAULT_TITLE,
    data: record.data,
    shareToken: record.shareToken,
  };
}

export async function createReport(
  data: HierarchicalResult,
): Promise<Report> {
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

  const store = getStore();
  const success = await store.atomicSaveRecordWithToken(record, shareToken);

  if (!success) {
    throw new Error("Failed to create report");
  }

  return toReport(record);
}

export async function getReportByToken(
  token: string,
): Promise<Report | null> {
  const store = getStore();
  const id = await store.getReportIdByToken(token);
  if (!id) {
    return null;
  }

  const record = await store.getRecord(id);
  if (!record || !record.shareEnabled) {
    return null;
  }

  return toReport(record);
}

// Admin operations (future use)

export async function regenerateShareToken(
  id: string,
): Promise<string | null> {
  const store = getStore();
  const record = await store.getRecord(id);
  if (!record) {
    return null;
  }

  const oldToken = record.shareToken;
  const newToken = nanoid(21);

  const updated: ReportRecord = {
    ...record,
    shareToken: newToken,
  };

  const success = await store.atomicUpdateToken(
    id,
    oldToken,
    newToken,
    updated,
  );
  return success ? newToken : null;
}

export async function deleteReport(id: string): Promise<boolean> {
  const store = getStore();
  const record = await store.getRecord(id);
  if (!record) {
    return false;
  }

  return store.atomicDeleteRecordWithToken(id, record.shareToken);
}
