/**
 * I18N type definitions
 */

import type { Locale } from "./config.ts";
import type { TranslationsData } from "./derived-types.ts";

// Re-export Locale from config for convenience
export type { Locale } from "./config.ts";

/** I18N state for Fresh context */
export interface I18nState {
  locale: Locale;
  translations: TranslationsData;
}
