import { define } from "@/utils.ts";
import { createReport } from "@/lib/db.ts";
import {
  validateHierarchicalResult,
  ValidationError,
} from "@/lib/validation.ts";
import type { CreateReportResponse } from "@/lib/types.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      // Parse JSON body
      const body = await ctx.req.json();

      // Validate the data
      const validatedData = validateHierarchicalResult(body);

      // Create report in database
      const record = await createReport(validatedData);

      // Build share URL
      const url = new URL(ctx.req.url);
      const shareUrl = `${url.origin}/share/${record.shareToken}`;

      const response: CreateReportResponse = {
        id: record.id,
        shareToken: record.shareToken,
        shareUrl,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
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
