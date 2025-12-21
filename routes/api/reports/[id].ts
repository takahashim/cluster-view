import { define } from "@/utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import { deleteReportWithOwnerCheck } from "@/lib/repository.ts";

export const handler = define.handlers({
  async DELETE(ctx) {
    const user = await getCurrentUser(ctx.req);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { id } = ctx.params;
    const result = await deleteReportWithOwnerCheck(id, user.id);

    if (!result.success) {
      const status = result.error === "Report not found" ? 404 : 403;
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(null, { status: 204 });
  },
});
