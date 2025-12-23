/**
 * I18N Client Module
 *
 * Functions safe to use in islands and client-side code.
 * Does NOT import translation JSON files (those are passed via props).
 */

/**
 * Interpolate parameters into a template string.
 * Use this on the client side for dynamic strings.
 *
 * @param template - Template string with {key} placeholders
 * @param params - Parameters to interpolate
 * @returns Interpolated string
 *
 * @example
 * interpolate("{count}件", { count: 100 }) // returns "100件"
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}
