/**
 * I18N Interpolation Module
 *
 * String interpolation utility for translation templates.
 * Works on both server and client side.
 */

/**
 * Interpolate parameters into a template string.
 *
 * @param template - Template string with {key} placeholders
 * @param params - Parameters to interpolate
 * @returns Interpolated string
 *
 * @example
 * interpolate("{count}件", { count: 100 }) // returns "100件"
 * interpolate("{min}〜{max}", { min: 1, max: 10 }) // returns "1〜10"
 */
export function interpolate(
  template: string,
  params: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}
