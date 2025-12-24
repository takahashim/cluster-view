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

  await t.step("retrieves report by token", async () => {
    const store = new MemoryStore();
    const record = createTestReportRecord({ shareToken: "unique-token" });

    await store.saveRecord(record);
    const result = await store.getReportByToken("unique-token");

    assertExists(result);
    assertEquals(result.id, record.id);
  });

  await t.step("returns null for non-existent token", async () => {
    const store = new MemoryStore();
    const result = await store.getReportByToken("non-existent");
    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - User operations", async (t) => {
  await t.step("saves and retrieves a user", async () => {
    const store = new MemoryStore();
    const user = createTestUserRecord();

    await store.saveUser(user);
    const result = await store.getUser(user.id);

    assertExists(result);
    assertEquals(result.id, user.id);
    assertEquals(result.email, user.email);
  });

  await t.step("returns null for non-existent user", async () => {
    const store = new MemoryStore();
    const result = await store.getUser("non-existent");
    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - Session operations", async (t) => {
  await t.step("saves and retrieves session", async () => {
    const store = new MemoryStore();

    await store.saveSession("session-1", "user-1");
    const result = await store.getSession("session-1");

    assertEquals(result, "user-1");
  });

  await t.step("returns null for non-existent session", async () => {
    const store = new MemoryStore();
    const result = await store.getSession("non-existent");
    assertEquals(result, null);
  });

  await t.step("returns null for expired session", async () => {
    const store = new MemoryStore();

    // Access private sessions map to create an expired session
    // @ts-ignore - accessing private for testing
    store.sessions.set("expired-session", {
      userId: "user-1",
      expiresAt: Date.now() - 1000, // expired 1 second ago
    });

    const result = await store.getSession("expired-session");
    assertEquals(result, null);
  });
});

Deno.test("MemoryStore - Report by owner operations", async (t) => {
  await t.step("retrieves reports by owner", async () => {
    const store = new MemoryStore();

    const report1 = createTestReportRecord({ id: "r1", ownerId: "user-1" });
    const report2 = createTestReportRecord({ id: "r2", ownerId: "user-1" });
    const report3 = createTestReportRecord({ id: "r3", ownerId: "user-2" });

    await store.saveRecord(report1);
    await store.saveRecord(report2);
    await store.saveRecord(report3);

    const user1Reports = await store.getReportsByOwner("user-1");
    const user2Reports = await store.getReportsByOwner("user-2");

    assertEquals(user1Reports.length, 2);
    assertEquals(user2Reports.length, 1);
  });

  await t.step("returns empty array for user with no reports", async () => {
    const store = new MemoryStore();
    const result = await store.getReportsByOwner("no-reports-user");
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

    const reports = await store.getReportsByOwner("user-1");

    assertEquals(reports[0].id, "r2"); // newest first
    assertEquals(reports[1].id, "r3");
    assertEquals(reports[2].id, "r1"); // oldest last
  });
});

Deno.test("MemoryStore - getAllReports", async (t) => {
  await t.step(
    "returns all reports sorted by createdAt descending",
    async () => {
      const store = new MemoryStore();

      const report1 = createTestReportRecord({
        id: "r1",
        createdAt: "2024-01-01T00:00:00Z",
      });
      const report2 = createTestReportRecord({
        id: "r2",
        createdAt: "2024-01-03T00:00:00Z",
      });

      await store.saveRecord(report1);
      await store.saveRecord(report2);

      const reports = await store.getAllReports();

      assertEquals(reports.length, 2);
      assertEquals(reports[0].id, "r2");
      assertEquals(reports[1].id, "r1");
    },
  );
});
