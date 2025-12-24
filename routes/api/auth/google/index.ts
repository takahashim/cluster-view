import { define } from "@/utils.ts";
import { signIn } from "@/lib/auth.ts";

export const handler = define.handlers({
  GET(ctx) {
    return signIn(ctx.req);
  },
});
