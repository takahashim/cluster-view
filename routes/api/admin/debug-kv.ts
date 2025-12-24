import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
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

    const store = getStore();

    // Get all reports (metadata only)
    const reports = await store.getAllReportRecords();

    // Get summary
    const summary = {
      totalReports: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        title: r.title,
        ownerId: r.ownerId,
        createdAt: r.createdAt,
        shareToken: r.shareToken,
        shareEnabled: r.shareEnabled,
        dataChunks: r.dataChunks,
        commentCount: r.commentCount,
      })),
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
