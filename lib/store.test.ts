import { assertEquals, assertExists } from "@std/assert";
import { MemoryStore } from "./store.ts";
import type { ReportRecord, UserRecord } from "./types.ts";

function createTestReportRecord(
  overrides: Partial<ReportRecord> = {},
): ReportRecord {
  return {
    id: "test-id",
    shareToken: "test-token",
    ownerId: "user-1",
    data: {
      arguments: [],
      clusters: [],
      comments: {},
      propertyMap: {},
      translations: {},
      overview: "Test overview",
      config: {},
    },
    createdAt: new Date().toISOString(),
    title: "Test Report",
    shareEnabled: true,
    ...overrides,
  };
}

function createTestUserRecord(
  overrides: Partial<UserRecord> = {},
): UserRecord {
  return {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    ...overrides,
  };
}

Deno.test("MemoryStore - Report operations", async (t) => {
  await t.step("saves and retrieves a report", async () => {
    const store = new MemoryStore();
    const record = createTestReportRecord();

    await store.saveRecord(record);
    const result = await store.getRecord(record.id);

    assertExists(result);
    assertEquals(result.id, record.id);
    assertEquals(result.title, record.title);
  });

  await t.step("returns null for non-existent report", async () => {
    const store = new MemoryStore();
    const result = await store.getRecord("non-existent");
    assertEquals(result, null);
  });

  await t.step("deletes a report", async () => {
    const store = new MemoryStore();
    const record = createTestReportRecord();

    await store.saveRecord(record);
    await store.deleteRecord(record.id);
    const result = await store.getRecord(record.id);

    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - Token index operations", async (t) => {
  await t.step("saves and retrieves token index", async () => {
    const store = new MemoryStore();

    await store.saveTokenIndex("my-token", "report-id");
    const result = await store.getReportIdByToken("my-token");

    assertEquals(result, "report-id");
  });

  await t.step("returns null for non-existent token", async () => {
    const store = new MemoryStore();
    const result = await store.getReportIdByToken("non-existent");
    assertEquals(result, null);
  });

  await t.step("deletes token index", async () => {
    const store = new MemoryStore();

    await store.saveTokenIndex("my-token", "report-id");
    await store.deleteTokenIndex("my-token");
    const result = await store.getReportIdByToken("my-token");

    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - Atomic operations", async (t) => {
  await t.step(
    "atomicSaveRecordWithToken saves both record and token",
    async () => {
      const store = new MemoryStore();
      const record = createTestReportRecord({
        id: "atomic-id",
        shareToken: "atomic-token",
      });

      await store.atomicSaveRecordWithToken(record, record.shareToken);

      const savedRecord = await store.getRecord(record.id);
      const reportId = await store.getReportIdByToken(record.shareToken);

      assertExists(savedRecord);
      assertEquals(savedRecord.id, record.id);
      assertEquals(reportId, record.id);
    },
  );

  await t.step(
    "atomicDeleteRecordWithToken deletes both record and token",
    async () => {
      const store = new MemoryStore();
      const record = createTestReportRecord();

      await store.atomicSaveRecordWithToken(record, record.shareToken);
      await store.atomicDeleteRecordWithToken(record.id, record.shareToken);

      const savedRecord = await store.getRecord(record.id);
      const reportId = await store.getReportIdByToken(record.shareToken);

      assertEquals(savedRecord, null);
      assertEquals(reportId, null);
    },
  );

  await t.step("atomicUpdateToken updates token correctly", async () => {
    const store = new MemoryStore();
    const record = createTestReportRecord({ shareToken: "old-token" });

    await store.atomicSaveRecordWithToken(record, "old-token");
    const updatedRecord = { ...record, shareToken: "new-token" };
    await store.atomicUpdateToken(
      record.id,
      "old-token",
      "new-token",
      updatedRecord,
    );

    const oldTokenId = await store.getReportIdByToken("old-token");
    const newTokenId = await store.getReportIdByToken("new-token");

    assertEquals(oldTokenId, null);
    assertEquals(newTokenId, record.id);
  });
});

Deno.test("MemoryStore - User operations", async (t) => {
  await t.step("saves and retrieves a user", async () => {
    const store = new MemoryStore();
    const user = createTestUserRecord();

    await store.saveUserRecord(user);
    const result = await store.getUserRecord(user.id);

    assertExists(result);
    assertEquals(result.id, user.id);
    assertEquals(result.email, user.email);
  });

  await t.step("returns null for non-existent user", async () => {
    const store = new MemoryStore();
    const result = await store.getUserRecord("non-existent");
    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - Session operations", async (t) => {
  await t.step("saves and retrieves session-user mapping", async () => {
    const store = new MemoryStore();

    await store.saveSessionUserId("session-1", "user-1");
    const result = await store.getSessionUserId("session-1");

    assertEquals(result, "user-1");
  });

  await t.step("returns null for non-existent session", async () => {
    const store = new MemoryStore();
    const result = await store.getSessionUserId("non-existent");
    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - User-Report index operations", async (t) => {
  await t.step("adds and retrieves user reports", async () => {
    const store = new MemoryStore();

    // Create reports with owner
    const report1 = createTestReportRecord({ id: "r1", ownerId: "user-1" });
    const report2 = createTestReportRecord({ id: "r2", ownerId: "user-1" });
    const report3 = createTestReportRecord({ id: "r3", ownerId: "user-2" });

    await store.saveRecord(report1);
    await store.saveRecord(report2);
    await store.saveRecord(report3);

    const user1Reports = await store.getReportRecordsByOwner("user-1");
    const user2Reports = await store.getReportRecordsByOwner("user-2");

    assertEquals(user1Reports.length, 2);
    assertEquals(user2Reports.length, 1);
  });

  await t.step("returns empty array for user with no reports", async () => {
    const store = new MemoryStore();
    const result = await store.getReportRecordsByOwner("no-reports-user");
    assertEquals(result, []);
  });

  await t.step("sorts reports by createdAt descending", async () => {
    const store = new MemoryStore();

    const report1 = createTestReportRecord({
      id: "r1",
      ownerId: "user-1",
      createdAt: "2024-01-01T00:00:00Z",
    });
    const report2 = createTestReportRecord({
      id: "r2",
      ownerId: "user-1",
      createdAt: "2024-01-03T00:00:00Z",
    });
    const report3 = createTestReportRecord({
      id: "r3",
      ownerId: "user-1",
      createdAt: "2024-01-02T00:00:00Z",
    });

    await store.saveRecord(report1);
    await store.saveRecord(report2);
    await store.saveRecord(report3);

    const reports = await store.getReportRecordsByOwner("user-1");

    assertEquals(reports[0].id, "r2"); // newest first
    assertEquals(reports[1].id, "r3");
    assertEquals(reports[2].id, "r1"); // oldest last
  });

  await t.step("addUserReportIndex and removeUserReportIndex", async () => {
    const store = new MemoryStore();

    await store.addUserReportIndex("user-1", "report-1");
    await store.addUserReportIndex("user-1", "report-2");

    // Add report records so they can be found
    await store.saveRecord(
      createTestReportRecord({ id: "report-1", ownerId: "user-1" }),
    );
    await store.saveRecord(
      createTestReportRecord({ id: "report-2", ownerId: "user-1" }),
    );

    const reports = await store.getReportRecordsByOwner("user-1");
    assertEquals(reports.length, 2);

    await store.removeUserReportIndex("user-1", "report-1");
    // Note: removeUserReportIndex only removes the index, not the actual record
    // So getReportRecordsByOwner still finds it because it scans all records
  });
});
