import { nanoid } from "nanoid";
import type {
  HierarchicalResult,
  Report,
  ReportRecord,
  UserRecord,
} from "./types.ts";
import { getStore, type Store } from "./store.ts";

export const DEFAULT_TITLE = "分析結果";

// User domain entity
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    picture: record.picture,
  };
}

export function extractTitle(
  config: Record<string, unknown>,
): string | undefined {
  const question = config.question;
  if (typeof question === "string" && question.trim()) {
    return question.trim();
  }
  return undefined;
}

export function toReport(record: ReportRecord): Report {
  return {
    id: record.id,
    title: record.title || DEFAULT_TITLE,
    data: record.data,
    shareToken: record.shareToken,
    createdAt: record.createdAt,
  };
}

export async function createReport(
  data: HierarchicalResult,
  ownerId: string,
  store: Store = getStore(),
): Promise<Report> {
  const id = crypto.randomUUID();
  const shareToken = nanoid(21);
  const title = extractTitle(data.config);
  const commentCount = data.comment_num ??
    Object.keys(data.comments || {}).length;

  const record: ReportRecord = {
    id,
    shareToken,
    ownerId,
    data,
    createdAt: new Date().toISOString(),
    title,
    shareEnabled: true,
    commentCount,
  };

  await store.saveRecord(record);
  return toReport(record);
}

export async function getReportByToken(
  token: string,
  store: Store = getStore(),
): Promise<Report | null> {
  const record = await store.getReportByToken(token);
  if (!record || !record.shareEnabled) {
    return null;
  }
  return toReport(record);
}

// Admin operations

export interface AdminReportSummary {
  id: string;
  title: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  commentCount: number;
  shareUrl: string;
  shareEnabled: boolean;
}

export async function getAllReportsForAdmin(
  store: Store = getStore(),
): Promise<AdminReportSummary[]> {
  const records = await store.getAllReports();
  const summaries: AdminReportSummary[] = [];

  for (const record of records) {
    const owner = await store.getUser(record.ownerId);
    summaries.push({
      id: record.id,
      title: record.title || DEFAULT_TITLE,
      createdAt: record.createdAt,
      ownerName: owner?.name || "Unknown",
      ownerEmail: owner?.email || "",
      commentCount: record.commentCount ?? 0,
      shareUrl: `/share/${record.shareToken}`,
      shareEnabled: record.shareEnabled,
    });
  }

  return summaries;
}

export async function regenerateShareToken(
  id: string,
  store: Store = getStore(),
): Promise<string | null> {
  const record = await store.getRecord(id);
  if (!record) return null;

  const updated: ReportRecord = {
    ...record,
    shareToken: nanoid(21),
  };

  await store.saveRecord(updated);
  return updated.shareToken;
}

export async function deleteReport(
  id: string,
  store: Store = getStore(),
): Promise<boolean> {
  const record = await store.getRecord(id);
  if (!record) return false;

  await store.deleteRecord(id);
  return true;
}

// User operations

export async function getUser(
  userId: string,
  store: Store = getStore(),
): Promise<User | null> {
  const record = await store.getUser(userId);
  return record ? toUser(record) : null;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getOrCreateUser(
  profile: GoogleProfile,
  store: Store = getStore(),
): Promise<User> {
  const now = new Date().toISOString();
  let record = await store.getUser(profile.sub);

  if (record) {
    record = { ...record, lastLoginAt: now };
  } else {
    record = {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      createdAt: now,
      lastLoginAt: now,
    };
  }

  await store.saveUser(record);
  return toUser(record);
}

export async function getReportsByOwner(
  ownerId: string,
  store: Store = getStore(),
): Promise<Report[]> {
  const records = await store.getReportsByOwner(ownerId);
  return records.map(toReport);
}

export async function deleteReportWithOwnerCheck(
  id: string,
  requesterId: string,
  store: Store = getStore(),
): Promise<{ success: boolean; error?: string }> {
  const record = await store.getRecord(id);

  if (!record) {
    return { success: false, error: "Report not found" };
  }

  if (record.ownerId !== requesterId) {
    return { success: false, error: "Not authorized to delete this report" };
  }

  await store.deleteRecord(id);
  return { success: true };
}
