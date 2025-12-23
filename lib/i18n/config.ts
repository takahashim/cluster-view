/**
 * I18N Configuration
 *
 * To add a new language:
 * 1. Create translations/{locale}.json file
 * 2. Import the JSON and add to the section below
 */

import ja from "./translations/ja.json" with { type: "json" };
import en from "./translations/en.json" with { type: "json" };

// =============================================================================
// Language Configuration - Add new languages here
// =============================================================================

/** Supported locale codes */
export const SUPPORTED_LOCALES = ["ja", "en"] as const;

/** All translations keyed by locale */
export const translations = { ja, en };

/** Display names for each locale (in their native language) */
export const LOCALE_NAMES = {
  ja: "日本語",
  en: "English",
} as const;

// =============================================================================
// Derived Types and Other Settings
// =============================================================================

/** Supported locale type */
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale when no match found */
export const DEFAULT_LOCALE: Locale = "ja";

/** Cookie name for storing user's language preference */
export const LOCALE_COOKIE_NAME = "locale";

/** Cookie max age in seconds (1 year) */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
