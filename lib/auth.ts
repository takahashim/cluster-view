/// <reference lib="deno.unstable" />
import { getUser, type User } from "./repository.ts";
import { getStore } from "./store.ts";

// Check if Deno KV is available at runtime (not at build time)
// Note: This is used by @deno/kv-oauth which requires Deno KV for session storage.
// This will be removed in Phase 2 when we migrate to Arctic.
function isKvAvailable(): boolean {
  return typeof Deno !== "undefined" && typeof Deno.openKv === "function";
}

// Lazy-loaded OAuth helpers
let _signIn: ((request: Request) => Promise<Response>) | null = null;
let _handleCallback:
  | ((request: Request) => Promise<{
    response: Response;
    sessionId?: string;
    tokens?: { accessToken: string };
  }>)
  | null = null;
let _signOut: ((request: Request) => Promise<Response>) | null = null;
let _getSessionId: ((request: Request) => Promise<string | undefined>) | null =
  null;

async function initOAuth() {
  if (!isKvAvailable()) {
    console.warn("[Auth] Deno KV not available, OAuth disabled");
    return;
  }

  try {
    const { createGoogleOAuthConfig, createHelpers, getSessionId } =
      await import("@deno/kv-oauth");

    const oauthConfig = createGoogleOAuthConfig({
      redirectUri: Deno.env.get("OAUTH_REDIRECT_URI") ||
        "http://localhost:8000/api/auth/google/callback",
      scope: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    });

    const helpers = createHelpers(oauthConfig);
    _signIn = helpers.signIn;
    _handleCallback = helpers.handleCallback;
    _signOut = helpers.signOut;
    _getSessionId = getSessionId;
  } catch (error) {
    console.error("[Auth] Failed to initialize OAuth:", error);
  }
}

// Initialize OAuth on first use
let initPromise: Promise<void> | null = null;
async function ensureInitialized() {
  if (!initPromise) {
    initPromise = initOAuth();
  }
  await initPromise;
}

// Exported OAuth functions with lazy initialization
export async function signIn(request: Request): Promise<Response> {
  await ensureInitialized();
  if (!_signIn) {
    return new Response("OAuth not available in development mode", {
      status: 503,
    });
  }
  return _signIn(request);
}

export async function handleCallback(request: Request): Promise<{
  response: Response;
  sessionId?: string;
  tokens?: { accessToken: string };
}> {
  await ensureInitialized();
  if (!_handleCallback) {
    return {
      response: new Response("OAuth not available in development mode", {
        status: 503,
      }),
    };
  }
  return _handleCallback(request);
}

export async function signOut(request: Request): Promise<Response> {
  await ensureInitialized();
  if (!_signOut) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }
  return _signOut(request);
}

export async function getSessionId(
  request: Request,
): Promise<string | undefined> {
  await ensureInitialized();
  if (!_getSessionId) {
    return undefined;
  }
  return _getSessionId(request);
}

// Fetch Google user info from access token
export async function getGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
}> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("Failed to fetch user info from Google");
  }
  return response.json();
}

// Get current user from session (returns User domain entity)
export async function getCurrentUser(request: Request): Promise<User | null> {
  const sessionId = await getSessionId(request);
  if (!sessionId) return null;

  const store = getStore();
  const userId = await store.getSessionUserId(sessionId);
  if (!userId) return null;

  return getUser(userId);
}
