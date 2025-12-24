import server from "./_fresh/server.js";
import { runWithEnv } from "./lib/env.ts";

export default {
  fetch(request, env, ctx) {
    // Run with Cloudflare Workers environment variables (request-scoped)
    return runWithEnv(env ?? {}, () => server.fetch(request, env, ctx));
  },
};
