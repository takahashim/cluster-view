import { define } from "@/utils.ts";
import { signIn } from "@/lib/auth.ts";

export const handler = define.handlers({
  async GET(ctx) {
    return await signIn(ctx.req);
  },
});
