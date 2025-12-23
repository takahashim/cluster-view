/**
 * I18N Configuration
 *
 * To add a new language:
 * 1. Add the locale code to SUPPORTED_LOCALES
 * 2. Add the display name to LOCALE_NAMES
 * 3. Create translations/{locale}.json file
 * 4. Import and add to translations in index.ts
 */

/** Supported locale codes */
export const SUPPORTED_LOCALES = ["ja", "en"] as const;

/** Default locale when no match found */
export const DEFAULT_LOCALE = "ja" as const;

/** Display names for each locale (in their native language) */
export const LOCALE_NAMES: Record<(typeof SUPPORTED_LOCALES)[number], string> =
  {
    ja: "日本語",
    en: "English",
  };

/** Cookie name for storing user's language preference */
export const LOCALE_COOKIE_NAME = "locale";

/** Cookie max age in seconds (1 year) */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
