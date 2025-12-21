import { assertEquals, assertExists } from "@std/assert";
import { MemoryStore } from "./store.ts";
import {
  createReport,
  DEFAULT_TITLE,
  deleteReport,
  deleteReportWithOwnerCheck,
  extractTitle,
  getOrCreateUser,
  getReportByToken,
  getReportsByOwner,
  getUser,
  regenerateShareToken,
  toReport,
  toUser,
} from "./repository.ts";
import type { HierarchicalResult, ReportRecord, UserRecord } from "./types.ts";

function createTestData(
  overrides: Partial<HierarchicalResult> = {},
): HierarchicalResult {
  return {
    arguments: [],
    clusters: [],
    comments: {},
    propertyMap: {},
    translations: {},
    overview: "Test overview",
    config: {},
    ...overrides,
  };
}

Deno.test("extractTitle", async (t) => {
  await t.step("returns question from config", () => {
    const result = extractTitle({ question: "What is this?" });
    assertEquals(result, "What is this?");
  });

  await t.step("trims whitespace", () => {
    const result = extractTitle({ question: "  Hello World  " });
    assertEquals(result, "Hello World");
  });

  await t.step("returns undefined for empty question", () => {
    const result = extractTitle({ question: "" });
    assertEquals(result, undefined);
  });

  await t.step("returns undefined for whitespace-only question", () => {
    const result = extractTitle({ question: "   " });
    assertEquals(result, undefined);
  });

  await t.step("returns undefined when question is missing", () => {
    const result = extractTitle({});
    assertEquals(result, undefined);
  });

  await t.step("returns undefined for non-string question", () => {
    const result = extractTitle({ question: 123 });
    assertEquals(result, undefined);
  });
});

Deno.test("toUser", async (t) => {
  await t.step("converts UserRecord to User", () => {
    const record: UserRecord = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      picture: "https://example.com/pic.jpg",
      createdAt: "2024-01-01T00:00:00Z",
      lastLoginAt: "2024-01-02T00:00:00Z",
    };

    const user = toUser(record);

    assertEquals(user.id, "user-1");
    assertEquals(user.email, "test@example.com");
    assertEquals(user.name, "Test User");
    assertEquals(user.picture, "https://example.com/pic.jpg");
    // Excludes createdAt and lastLoginAt
    assertEquals(Object.keys(user).length, 4);
  });

  await t.step("handles missing picture", () => {
    const record: UserRecord = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      createdAt: "2024-01-01T00:00:00Z",
      lastLoginAt: "2024-01-02T00:00:00Z",
    };

    const user = toUser(record);
    assertEquals(user.picture, undefined);
  });
});

Deno.test("toReport", async (t) => {
  await t.step("converts ReportRecord to Report", () => {
    const record: ReportRecord = {
      id: "report-1",
      shareToken: "token-123",
      ownerId: "user-1",
      data: createTestData(),
      createdAt: "2024-01-01T00:00:00Z",
      title: "My Report",
      shareEnabled: true,
    };

    const report = toReport(record);

    assertEquals(report.id, "report-1");
    assertEquals(report.title, "My Report");
    assertEquals(report.shareToken, "token-123");
    assertEquals(report.createdAt, "2024-01-01T00:00:00Z");
    assertExists(report.data);
  });

  await t.step("uses default title when title is missing", () => {
    const record: ReportRecord = {
      id: "report-1",
      shareToken: "token-123",
      ownerId: "user-1",
      data: createTestData(),
      createdAt: "2024-01-01T00:00:00Z",
      shareEnabled: true,
    };

    const report = toReport(record);
    assertEquals(report.title, DEFAULT_TITLE);
  });
});

Deno.test("createReport", async (t) => {
  await t.step("creates a report with generated id and token", async () => {
    const store = new MemoryStore();
    const data = createTestData({ config: { question: "Test Question" } });

    const report = await createReport(data, "user-1", store);

    assertExists(report.id);
    assertExists(report.shareToken);
    assertEquals(report.title, "Test Question");
    assertExists(report.createdAt);
  });

  await t.step("uses default title when no question in config", async () => {
    const store = new MemoryStore();
    const data = createTestData();

    const report = await createReport(data, "user-1", store);

    assertEquals(report.title, DEFAULT_TITLE);
  });

  await t.step("saves report to store", async () => {
    const store = new MemoryStore();
    const data = createTestData();

    const report = await createReport(data, "user-1", store);
    const retrieved = await store.getRecord(report.id);

    assertExists(retrieved);
    assertEquals(retrieved.id, report.id);
    assertEquals(retrieved.ownerId, "user-1");
  });

  await t.step("creates token index", async () => {
    const store = new MemoryStore();
    const data = createTestData();

    const report = await createReport(data, "user-1", store);
    const reportId = await store.getReportIdByToken(report.shareToken);

    assertEquals(reportId, report.id);
  });
});

Deno.test("getReportByToken", async (t) => {
  await t.step("retrieves report by token", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);

    const report = await getReportByToken(created.shareToken, store);

    assertExists(report);
    assertEquals(report.id, created.id);
  });

  await t.step("returns null for non-existent token", async () => {
    const store = new MemoryStore();
    const report = await getReportByToken("non-existent", store);
    assertEquals(report, null);
  });

  await t.step("returns null for disabled share", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);

    // Disable sharing
    const record = await store.getRecord(created.id);
    if (record) {
      await store.saveRecord({ ...record, shareEnabled: false });
    }

    const report = await getReportByToken(created.shareToken, store);
    assertEquals(report, null);
  });
});

Deno.test("deleteReport", async (t) => {
  await t.step("deletes a report", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);

    const success = await deleteReport(created.id, store);

    assertEquals(success, true);
    assertEquals(await store.getRecord(created.id), null);
    assertEquals(await store.getReportIdByToken(created.shareToken), null);
  });

  await t.step("returns false for non-existent report", async () => {
    const store = new MemoryStore();
    const success = await deleteReport("non-existent", store);
    assertEquals(success, false);
  });
});

Deno.test("regenerateShareToken", async (t) => {
  await t.step("generates new token", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);
    const oldToken = created.shareToken;

    const newToken = await regenerateShareToken(created.id, store);

    assertExists(newToken);
    assertEquals(newToken !== oldToken, true);
  });

  await t.step("old token no longer works", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);
    const oldToken = created.shareToken;

    await regenerateShareToken(created.id, store);

    const reportId = await store.getReportIdByToken(oldToken);
    assertEquals(reportId, null);
  });

  await t.step("new token works", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);

    const newToken = await regenerateShareToken(created.id, store);

    const reportId = await store.getReportIdByToken(newToken!);
    assertEquals(reportId, created.id);
  });

  await t.step("returns null for non-existent report", async () => {
    const store = new MemoryStore();
    const result = await regenerateShareToken("non-existent", store);
    assertEquals(result, null);
  });
});

Deno.test("getUser", async (t) => {
  await t.step("retrieves user by id", async () => {
    const store = new MemoryStore();
    await store.saveUserRecord({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });

    const user = await getUser("user-1", store);

    assertExists(user);
    assertEquals(user.id, "user-1");
    assertEquals(user.email, "test@example.com");
  });

  await t.step("returns null for non-existent user", async () => {
    const store = new MemoryStore();
    const user = await getUser("non-existent", store);
    assertEquals(user, null);
  });
});

Deno.test("getOrCreateUser", async (t) => {
  await t.step("creates new user", async () => {
    const store = new MemoryStore();
    const profile = {
      sub: "google-123",
      email: "new@example.com",
      name: "New User",
      picture: "https://example.com/pic.jpg",
    };

    const user = await getOrCreateUser(profile, store);

    assertEquals(user.id, "google-123");
    assertEquals(user.email, "new@example.com");
    assertEquals(user.name, "New User");
    assertEquals(user.picture, "https://example.com/pic.jpg");
  });

  await t.step("returns existing user and updates lastLoginAt", async () => {
    const store = new MemoryStore();
    const profile = {
      sub: "google-123",
      email: "existing@example.com",
      name: "Existing User",
    };

    // Create user first time
    await getOrCreateUser(profile, store);
    const firstRecord = await store.getUserRecord("google-123");

    // Wait a bit to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    // Get user second time
    await getOrCreateUser(profile, store);
    const secondRecord = await store.getUserRecord("google-123");

    assertExists(firstRecord);
    assertExists(secondRecord);
    assertEquals(secondRecord.lastLoginAt !== firstRecord.lastLoginAt, true);
  });
});

Deno.test("getReportsByOwner", async (t) => {
  await t.step("returns reports for owner", async () => {
    const store = new MemoryStore();
    const data = createTestData();

    await createReport(data, "user-1", store);
    await createReport(data, "user-1", store);
    await createReport(data, "user-2", store);

    const user1Reports = await getReportsByOwner("user-1", store);
    const user2Reports = await getReportsByOwner("user-2", store);

    assertEquals(user1Reports.length, 2);
    assertEquals(user2Reports.length, 1);
  });

  await t.step("returns empty array for user with no reports", async () => {
    const store = new MemoryStore();
    const reports = await getReportsByOwner("no-reports", store);
    assertEquals(reports, []);
  });
});

Deno.test("deleteReportWithOwnerCheck", async (t) => {
  await t.step("deletes report when requester is owner", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);

    const result = await deleteReportWithOwnerCheck(
      created.id,
      "user-1",
      store,
    );

    assertEquals(result.success, true);
    assertEquals(result.error, undefined);
    assertEquals(await store.getRecord(created.id), null);
  });

  await t.step("fails when requester is not owner", async () => {
    const store = new MemoryStore();
    const data = createTestData();
    const created = await createReport(data, "user-1", store);

    const result = await deleteReportWithOwnerCheck(
      created.id,
      "user-2",
      store,
    );

    assertEquals(result.success, false);
    assertEquals(result.error, "Not authorized to delete this report");
    assertExists(await store.getRecord(created.id)); // Report still exists
  });

  await t.step("fails for non-existent report", async () => {
    const store = new MemoryStore();
    const result = await deleteReportWithOwnerCheck(
      "non-existent",
      "user-1",
      store,
    );

    assertEquals(result.success, false);
    assertEquals(result.error, "Report not found");
  });
});
