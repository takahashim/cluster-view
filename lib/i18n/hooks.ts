/**
 * I18N Hooks for Preact components
 *
 * Provides React/Preact hooks for translation functionality.
 */

import { useMemo } from "preact/hooks";
import { createT } from "./index.ts";
import type { TranslateFunction, Translations } from "./types.ts";

/**
 * Hook to get a translation function from translations object.
 * Memoizes the translator to prevent unnecessary re-creation.
 *
 * @param translations - The translations object from props
 * @returns A translation function
 *
 * @example
 * function MyComponent({ translations }: { translations: Translations }) {
 *   const t = useTranslation(translations);
 *   return <span>{t("common.login")}</span>;
 * }
 */
export function useTranslation(translations: Translations): TranslateFunction {
  return useMemo(() => createT(translations), [translations]);
}
