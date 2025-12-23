/**
 * I18N type definitions
 */

import type { SUPPORTED_LOCALES } from "./config.ts";

/** Supported locale type */
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Nested translations structure */
export interface Translations {
  [key: string]: string | Translations;
}

/** Translation function type */
export type TranslateFunction = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/** I18N state for Fresh context */
export interface I18nState {
  locale: Locale;
  t: TranslateFunction;
  translations: Translations;
}
