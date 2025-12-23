/**
 * I18N Middleware
 *
 * Detects user's preferred language and sets up i18n state for all routes.
 * Priority: Cookie > Accept-Language header > Default (ja)
 */

import { define } from "@/utils.ts";
import { createI18nState } from "@/lib/i18n/index.ts";

export default define.middleware(async (ctx) => {
  // Create i18n state from request and attach to context
  const i18nState = createI18nState(ctx.req);
  ctx.state.locale = i18nState.locale;
  ctx.state.translations = i18nState.translations;

  return await ctx.next();
});
