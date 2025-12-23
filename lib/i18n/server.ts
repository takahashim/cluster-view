/**
 * I18N Server Module
 *
 * Server-only functions for locale detection and translation.
 * These functions access Request headers/cookies and translation JSON files.
 */

import {
  DEFAULT_LOCALE,
  type Locale,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  translations,
} from "./config.ts";
import type { I18nState } from "./types.ts";
import type { TranslationsData } from "./derived-types.ts";

// =============================================================================
// Locale Detection
// =============================================================================

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

// =============================================================================
// Translation Functions
// =============================================================================

/**
 * Get all translations for a locale.
 * Used to pass translations to Preact islands.
 *
 * @param locale - The locale to get translations for
 * @returns The translations object
 */
export function getTranslations(locale: Locale): TranslationsData {
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
 * ctx.state.translations = state.translations;
 */
export function createI18nState(req: Request): I18nState {
  const locale = detectLocale(req);
  return {
    locale,
    translations: getTranslations(locale),
  };
}
