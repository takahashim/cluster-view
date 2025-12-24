import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";
import { getStore } from "@/lib/store.ts";

/**
 * One-time migration to add commentCount to existing reports.
 * This endpoint should be removed after migration is complete.
 *
 * Usage: POST /api/admin/migrate-comment-count
 * Requires admin authentication.
 */
export const handler = define.handlers({
  async POST(ctx) {
    const user = await getCurrentUser(ctx.req);

    if (!user || !isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const store = getStore();
    const records = await store.getAllReportRecords();

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of records) {
      // Skip if already has commentCount
      if (record.commentCount !== undefined) {
        skipped++;
        continue;
      }

      try {
        // Load full record with data chunks
        const fullRecord = await store.getRecord(record.id);
        if (!fullRecord || !fullRecord.data) {
          errors.push(`${record.id}: No data found`);
          continue;
        }

        // Calculate comment count
        const commentCount = fullRecord.data.comment_num ??
          Object.keys(fullRecord.data.comments || {}).length;

        // Update record with commentCount (save metadata only)
        const updatedRecord = {
          ...record,
          commentCount,
        };

        // Save updated record (without data, just metadata)
        await store.saveRecord(updatedRecord);
        migrated++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${record.id}: ${message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: records.length,
        migrated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});
