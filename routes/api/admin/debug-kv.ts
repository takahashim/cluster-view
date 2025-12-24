import { define } from "@/utils.ts";
import { getCurrentUser, getSessionId } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";
import { getStore } from "@/lib/store.ts";

/**
 * Debug endpoint to inspect KV data.
 * This endpoint should be removed after debugging.
 *
 * Usage: GET /api/admin/debug-kv
 * Requires admin authentication.
 */
export const handler = define.handlers({
  async GET(ctx) {
    const user = await getCurrentUser(ctx.req);

    if (!user || !isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const kv = await Deno.openKv();

    // Debug auth flow
    const sessionId = await getSessionId(ctx.req);
    const store = getStore();
    const userIdFromSession = sessionId
      ? await store.getSessionUserId(sessionId)
      : null;
    const authDebug = {
      sessionId: sessionId ? `${sessionId.slice(0, 10)}...` : null,
      userIdFromSession,
      storeType: store.constructor.name,
    };

    // Test write/read
    const testKey = ["_debug_test", "write_check"];
    const testValue = { timestamp: new Date().toISOString(), userId: user.id };
    await kv.set(testKey, testValue);
    const readBack = await kv.get(testKey);
    const writeTestResult = {
      written: testValue,
      readBack: readBack.value,
      success: JSON.stringify(readBack.value) === JSON.stringify(testValue),
    };

    // Count entries by prefix
    const prefixes = [
      "reports",
      "users",
      "sessions",
      "share_tokens",
      "user_reports",
      "report_data",
      // @deno/kv-oauth prefixes
      "site_sessions",
      "oauth_sessions",
    ];
    const counts: Record<string, number> = {};
    const samples: Record<string, unknown[]> = {};

    for (const prefix of prefixes) {
      const entries: unknown[] = [];
      const iter = kv.list({ prefix: [prefix] });
      for await (const entry of iter) {
        entries.push({
          key: entry.key,
          // Only show partial value to avoid huge output
          valueType: typeof entry.value,
          valuePreview: typeof entry.value === "object"
            ? Object.keys(entry.value as Record<string, unknown>).slice(0, 5)
            : String(entry.value).slice(0, 100),
        });
      }
      counts[prefix] = entries.length;
      samples[prefix] = entries.slice(0, 3); // Show first 3 samples
    }

    // Full KV scan - list ALL keys
    const allKeys: unknown[] = [];
    const fullIter = kv.list({ prefix: [] });
    for await (const entry of fullIter) {
      allKeys.push({
        key: entry.key,
        valueType: typeof entry.value,
      });
      if (allKeys.length >= 100) break; // Limit to first 100
    }

    const summary = {
      currentUser: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      authDebug,
      writeTestResult,
      entryCounts: counts,
      allKeysCount: allKeys.length,
      allKeys: allKeys.slice(0, 20), // Show first 20
      samples,
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
