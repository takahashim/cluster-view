/**
 * Cross-platform environment variable access
 * Works on Deno and Cloudflare Workers
 */

// globalThis is shared across all modules in the same V8 isolate
const ENV_KEY = "__CF_ENV__";

/**
 * Set the Cloudflare Workers environment (call from server.js entry point)
 */
export function setCfEnv(env: Record<string, unknown>): void {
  (globalThis as Record<string, unknown>)[ENV_KEY] = env;
}

/**
 * Get environment variable value
 * Tries: Cloudflare Workers env (globalThis) → Deno.env
 */
export function getEnv(key: string): string | undefined {
  // Cloudflare Workers (stored in globalThis)
  const cfEnv = (globalThis as Record<string, unknown>)[ENV_KEY] as
    | Record<string, unknown>
    | undefined;
  if (cfEnv && key in cfEnv) {
    const value = cfEnv[key];
    return typeof value === "string" ? value : undefined;
  }

  // Deno
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    return Deno.env.get(key);
  }

  return undefined;
}
