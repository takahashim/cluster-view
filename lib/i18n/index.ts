/**
 * I18N Module
 *
 * Provides internationalization support using island-i18n.
 *
 * To add a new language:
 * 1. Create translations/{locale}.json file (include "localeName" key)
 * 2. Import the JSON below and add to translations object
 * 3. Add locale to "locales" array in defineI18n config
 */

import { defineI18n, interpolate, type I18nStateOf } from "island-i18n";
import ja from "./translations/ja.json" with { type: "json" };
import en from "./translations/en.json" with { type: "json" };

// =============================================================================
// I18n Configuration
// =============================================================================

const i18n = defineI18n({
  locales: ["ja", "en"] as const,
  defaultLocale: "ja",
  translations: { ja, en },
});

/** Display names for each locale (derived from translations) */
export const LOCALE_NAMES = {
  ja: ja.localeName,
  en: en.localeName,
} as const;

// =============================================================================
// Type Exports
// =============================================================================

/** Supported locale type */
export type Locale = (typeof i18n.locales)[number];

/** Translations data structure */
export type TranslationsData = typeof ja;

/** Locale names mapping */
export type LocaleNames = typeof LOCALE_NAMES;

/** I18n state for Fresh context */
export type { I18nState } from "island-i18n";

// =============================================================================
// Config Exports
// =============================================================================

export const SUPPORTED_LOCALES = i18n.locales;
export const DEFAULT_LOCALE = i18n.defaultLocale;

// =============================================================================
// Function Exports
// =============================================================================

export { interpolate };

/** Detect locale from request (cookie takes priority over Accept-Language header) */
export function detectLocale(request: Request): Locale {
  return i18n.detectLocale(request) as Locale;
}

/** Get translations for a specific locale */
export function getTranslations(locale: Locale): TranslationsData {
  return i18n.getTranslations(locale) as TranslationsData;
}

/** I18n state with correct types for this application */
export type AppI18nState = I18nStateOf<typeof i18n>;

/** Create i18n state from request */
export function createI18nState(request: Request): AppI18nState {
  return i18n.createState(request) as AppI18nState;
}
