import { define } from "@/utils.ts";
import { createReport } from "@/lib/repository.ts";
import { validateHierarchicalResult, ValidationError } from "@/lib/validation.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const validatedData = validateHierarchicalResult(body);
      const report = await createReport(validatedData);

      const url = new URL(ctx.req.url);
      const shareUrl = `${url.origin}/share/${report.shareToken}`;

      return new Response(
        JSON.stringify({
          id: report.id,
          shareToken: report.shareToken,
          shareUrl,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (error instanceof SyntaxError) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      console.error("Error creating report:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
