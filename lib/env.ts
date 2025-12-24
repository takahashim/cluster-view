/**
 * Cross-platform environment variable access
 * Works on Deno and Cloudflare Workers (using AsyncLocalStorage)
 */

import { AsyncLocalStorage } from "node:async_hooks";

const envStorage = new AsyncLocalStorage<Record<string, string>>();

/**
 * Run a function with Cloudflare Workers environment variables
 * Use this to wrap request handlers
 */
export function runWithEnv<T>(env: Record<string, string>, fn: () => T): T {
  return envStorage.run(env, fn);
}

/**
 * Get environment variable value
 * Tries: AsyncLocalStorage (CF Workers) → Deno.env
 */
export function getEnv(key: string): string | undefined {
  // Cloudflare Workers (AsyncLocalStorage - request scoped)
  const store = envStorage.getStore();
  if (store?.[key] !== undefined) {
    return store[key];
  }

  // Deno
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    return Deno.env.get(key);
  }

  return undefined;
}
