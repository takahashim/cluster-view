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

  const record: ReportRecord = {
    id,
    shareToken,
    ownerId,
    data,
    createdAt: new Date().toISOString(),
    title,
    shareEnabled: true,
  };

  const success = await store.atomicSaveRecordWithToken(
    record,
    shareToken,
    ownerId,
  );

  if (!success) {
    throw new Error("Failed to create report");
  }

  return toReport(record);
}

export async function getReportByToken(
  token: string,
  store: Store = getStore(),
): Promise<Report | null> {
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
  store: Store = getStore(),
): Promise<string | null> {
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

export async function deleteReport(
  id: string,
  store: Store = getStore(),
): Promise<boolean> {
  const record = await store.getRecord(id);
  if (!record) {
    return false;
  }

  const success = await store.atomicDeleteRecordWithToken(
    id,
    record.shareToken,
  );

  // Remove from user's report index if owner exists
  if (success && record.ownerId) {
    await store.removeUserReportIndex(record.ownerId, id);
  }

  return success;
}

// User operations

export async function getUser(
  userId: string,
  store: Store = getStore(),
): Promise<User | null> {
  const record = await store.getUserRecord(userId);
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

  let record = await store.getUserRecord(profile.sub);

  if (record) {
    // Update last login
    record = { ...record, lastLoginAt: now };
    await store.saveUserRecord(record);
  } else {
    // Create new user
    record = {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      createdAt: now,
      lastLoginAt: now,
    };
    await store.saveUserRecord(record);
  }

  return toUser(record);
}

export async function getReportsByOwner(
  ownerId: string,
  store: Store = getStore(),
): Promise<Report[]> {
  const records = await store.getReportRecordsByOwner(ownerId);
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

  const success = await store.atomicDeleteRecordWithToken(
    id,
    record.shareToken,
  );

  if (success && record.ownerId) {
    await store.removeUserReportIndex(record.ownerId, id);
  }

  return { success };
}
