/**
 * I18N Module - Main Entry Point
 *
 * This module provides internationalization support for the application.
 *
 * To add a new language:
 * 1. Create translations/{locale}.json file
 * 2. Edit config.ts: import the JSON and add to SUPPORTED_LOCALES, translations, LOCALE_NAMES
 *
 * Import patterns:
 * - For types only: import type { ... } from "@/lib/i18n/index.ts"
 * - For server-side: import { createI18nState, detectLocale } from "@/lib/i18n/index.ts"
 * - For interpolation: import { interpolate } from "@/lib/i18n/index.ts"
 *
 * File organization:
 * - config.ts: Language config, translations data, constants
 * - types.ts: Base type definitions (Locale, Translations, etc.)
 * - derived-types.ts: Types derived from translation JSON
 * - interpolate.ts: String interpolation utility
 * - server.ts: Server-only functions (locale detection, translation creation)
 */

// =============================================================================
// Type Exports
// =============================================================================

// Base types
export type { I18nState, Locale } from "./types.ts";

// Derived types from translation JSON
export type { TranslationsData } from "./derived-types.ts";

// =============================================================================
// Config Exports
// =============================================================================

export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
} from "./config.ts";

// =============================================================================
// Utility Exports
// =============================================================================

export { interpolate } from "./interpolate.ts";

// =============================================================================
// Server-side Function Exports
// =============================================================================

export {
  createI18nState,
  detectLocale,
  detectLocaleFromHeader,
  getLocaleFromCookie,
  getTranslations,
} from "./server.ts";
