import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";

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

    // Count entries by prefix
    const prefixes = [
      "reports",
      "users",
      "sessions",
      "share_tokens",
      "user_reports",
      "report_data",
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

    const summary = {
      currentUser: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      entryCounts: counts,
      samples,
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
