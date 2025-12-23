/**
 * I18N Middleware
 *
 * Detects user's preferred language and sets up i18n state for all routes.
 * Priority: Cookie > Accept-Language header > Default (ja)
 */

export { i18nMiddleware as default } from "@/lib/i18n/index.ts";
