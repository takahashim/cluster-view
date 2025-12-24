/**
 * Cross-platform environment variable access
 * Works on Deno, Node.js, and Cloudflare Workers
 */

// Use globalThis to ensure env is shared across all module instances
const ENV_KEY = "__CF_ENV__";

/**
 * Set the Cloudflare Workers environment (call this from request handler)
 */
export function setCfEnv(env: Record<string, string>): void {
  (globalThis as Record<string, unknown>)[ENV_KEY] = env;
}

/**
 * Get environment variable value
 * Tries: Cloudflare Workers env → Deno.env → process.env
 */
export function getEnv(key: string): string | undefined {
  // Cloudflare Workers (stored in globalThis)
  const cfEnv = (globalThis as Record<string, unknown>)[ENV_KEY] as
    | Record<string, string>
    | undefined;
  if (cfEnv && key in cfEnv) {
    return cfEnv[key];
  }

  // Deno
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    return Deno.env.get(key);
  }

  // Node.js
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }

  return undefined;
}
