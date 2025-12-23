/**
 * I18N Core Module
 *
 * Provides language detection and translation functions.
 */

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
} from "./config.ts";
import type {
  I18nState,
  Locale,
  TranslateFunction,
  Translations,
} from "./types.ts";

// Import translation files
import ja from "./translations/ja.json" with { type: "json" };
import en from "./translations/en.json" with { type: "json" };

/** All translations keyed by locale */
const translations: Record<Locale, Translations> = {
  ja: ja as Translations,
  en: en as Translations,
};

// =============================================================================
// Auto-derived types from translation JSON
// =============================================================================

/** Type automatically derived from translation JSON structure */
export type TranslationsShape = typeof ja;

/** Common strings (buttons, labels) */
export type CommonStrings = TranslationsShape["common"];

/** ReportView page strings */
export type ReportViewStrings = TranslationsShape["reportView"];

/** Filter panel strings */
export type FilterStrings = TranslationsShape["reportView"]["filter"];

/** Chart type strings */
export type ChartTypeStrings = TranslationsShape["reportView"]["chartTypes"];

/** Breadcrumb strings */
export type BreadcrumbStrings = TranslationsShape["reportView"]["breadcrumb"];

/** Uploader strings */
export type UploaderStrings = TranslationsShape["uploader"];

/** Reports list strings */
export type ReportsStrings = TranslationsShape["reports"];

/** Strings needed for SharePage (ReportView island) */
export interface SharePageStrings {
  common: CommonStrings;
  reportView: ReportViewStrings;
}

/** Strings needed for HomePage (FileUploader island) */
export interface HomePageStrings {
  common: CommonStrings;
  uploader: UploaderStrings;
}

/** Strings needed for ReportsPage (ReportsList island) */
export interface ReportsPageStrings {
  common: CommonStrings;
  reports: ReportsStrings;
}

/**
 * Interpolate parameters into a template string.
 * Use this on the client side for dynamic strings.
 *
 * @param template - Template string with {key} placeholders
 * @param params - Parameters to interpolate
 * @returns Interpolated string
 *
 * @example
 * interpolateTemplate("{count}件", { count: 100 }) // returns "100件"
 */
export function interpolateTemplate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

/**
 * Parse Accept-Language header and detect the best matching locale.
 *
 * @param acceptLanguage - The Accept-Language header value
 * @returns The detected locale or default locale
 *
 * @example
 * detectLocaleFromHeader("en-US,en;q=0.9,ja;q=0.8") // returns "en"
 * detectLocaleFromHeader("ja,en;q=0.9") // returns "ja"
 * detectLocaleFromHeader("fr-FR") // returns "ja" (default)
 */
export function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ja;q=0.8")
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";q=");
      return {
        code: code.split("-")[0].toLowerCase(), // "en-US" -> "en"
        q: qValue ? parseFloat(qValue) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  // Find the first supported locale
  for (const { code } of languages) {
    if (SUPPORTED_LOCALES.includes(code as Locale)) {
      return code as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Get locale from cookie in request.
 *
 * @param req - The request object
 * @returns The locale from cookie or null
 */
export function getLocaleFromCookie(req: Request): Locale | null {
  const cookies = req.headers.get("Cookie");
  if (!cookies) return null;

  const regex = new RegExp(`${LOCALE_COOKIE_NAME}=(\\w+)`);
  const match = cookies.match(regex);

  if (match && SUPPORTED_LOCALES.includes(match[1] as Locale)) {
    return match[1] as Locale;
  }

  return null;
}

/**
 * Detect locale from request.
 * Priority: Cookie > Accept-Language > Default
 *
 * @param req - The request object
 * @returns The detected locale
 */
export function detectLocale(req: Request): Locale {
  // 1. Check cookie first (user preference)
  const cookieLocale = getLocaleFromCookie(req);
  if (cookieLocale) return cookieLocale;

  // 2. Check Accept-Language header
  const acceptLanguage = req.headers.get("Accept-Language");
  return detectLocaleFromHeader(acceptLanguage);
}

/**
 * Get nested value from translations object using dot notation.
 *
 * @param obj - The translations object
 * @param path - The key path (e.g., "home.features.visualization.title")
 * @returns The translation string or undefined
 */
function getNestedValue(obj: Translations, path: string): string | undefined {
  const keys = path.split(".");
  let current: Translations | string = obj;

  for (const key of keys) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Interpolate parameters into a translation string.
 *
 * @param text - The translation string with placeholders
 * @param params - The parameters to interpolate
 * @returns The interpolated string
 *
 * @example
 * interpolate("{count} 件の意見", { count: 100 }) // returns "100 件の意見"
 */
function interpolate(
  text: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return text;

  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

/**
 * Create a translation function for a specific locale.
 *
 * @param locale - The locale to use
 * @returns A translation function
 *
 * @example
 * const t = createTranslator("ja");
 * t("common.login") // returns "Googleでログイン"
 * t("common.comments", { count: 100 }) // returns "100 件の意見"
 */
export function createTranslator(locale: Locale): TranslateFunction {
  return (key: string, params?: Record<string, string | number>): string => {
    const text = getNestedValue(translations[locale], key);
    if (!text) {
      // Fallback to default locale
      const fallback = getNestedValue(translations[DEFAULT_LOCALE], key);
      if (!fallback) {
        console.warn(`Missing translation: ${key}`);
        return key;
      }
      return interpolate(fallback, params);
    }
    return interpolate(text, params);
  };
}

/**
 * Get all translations for a locale.
 * Used to pass translations to Preact islands.
 *
 * @param locale - The locale to get translations for
 * @returns The translations object
 */
export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}

/**
 * Create i18n state from a request.
 * This is the core logic used by the middleware, extracted for testability.
 *
 * @param req - The request object
 * @returns The i18n state to be attached to context
 *
 * @example
 * const state = createI18nState(req);
 * ctx.state.locale = state.locale;
 * ctx.state.t = state.t;
 * ctx.state.translations = state.translations;
 */
export function createI18nState(req: Request): I18nState {
  const locale = detectLocale(req);
  return {
    locale,
    t: createTranslator(locale),
    translations: getTranslations(locale),
  };
}

// Re-export types and config
export type { I18nState, Locale, TranslateFunction, Translations };
export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
} from "./config.ts";
