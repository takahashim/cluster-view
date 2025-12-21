import { define } from "@/utils.ts";
import { signOut } from "@/lib/auth.ts";

export const handler = define.handlers({
  async GET(ctx) {
    return await signOut(ctx.req);
  },
});
