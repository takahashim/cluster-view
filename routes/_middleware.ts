/**
 * Application Middleware
 *
 * 1. Initializes Turso database schema (once)
 * 2. Sets up i18n state for all routes
 */

import { define } from "@/utils.ts";
import { createI18nState } from "@/lib/i18n/index.ts";
import { initializeStore } from "@/lib/store.ts";

export default define.middleware(async (ctx) => {
  // Initialize database schema on first request
  await initializeStore();

  // Set up i18n state
  Object.assign(ctx.state, createI18nState(ctx.req));

  return await ctx.next();
});
