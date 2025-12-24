import server from "./_fresh/server.js";
import { setCfEnv } from "./lib/env.ts";

export default {
  fetch(request, env, ctx) {
    // Set Cloudflare Workers environment variables (shared via globalThis)
    if (env) {
      setCfEnv(env);
    }
    return server.fetch(request, env, ctx);
  },
};
