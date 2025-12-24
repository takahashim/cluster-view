import { define } from "@/utils.ts";
import { signOut } from "@/lib/auth.ts";

export const handler = define.handlers({
  GET(ctx) {
    return signOut(ctx.req);
  },
});
