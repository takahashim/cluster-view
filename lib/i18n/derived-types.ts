/**
 * I18N Derived Types
 *
 * Type definitions automatically derived from translation JSON structure.
 */

import { translations } from "./config.ts";

/** Type automatically derived from translation JSON structure */
export type TranslationsData = (typeof translations)[keyof typeof translations];
