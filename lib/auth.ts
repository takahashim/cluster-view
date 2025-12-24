import { Google } from "arctic";
import { getUser, type User } from "./repository.ts";
import { getStore, SESSION_EXPIRY_MS } from "./store.ts";
import { getEnv } from "./env.ts";

// Cookie names
const SESSION_COOKIE_NAME = "session";
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const OAUTH_VERIFIER_COOKIE_NAME = "oauth_code_verifier";

// Check if running in production (works on Deno Deploy, Cloudflare Workers, etc.)
function isProduction(): boolean {
  // Deno Deploy
  if (getEnv("DENO_DEPLOYMENT_ID")) return true;
  // Cloudflare Workers / generic production flag
  if (getEnv("CF_PAGES") || getEnv("CF_WORKER")) return true;
  if (getEnv("NODE_ENV") === "production") return true;
  if (getEnv("PRODUCTION") === "true") return true;
  return false;
}

// Google OAuth client (lazy initialization for Cloudflare Workers compatibility)
let google: Google | null = null;

function getGoogleClient(): Google {
  if (!google) {
    google = new Google(
      getEnv("GOOGLE_CLIENT_ID") ?? "",
      getEnv("GOOGLE_CLIENT_SECRET") ?? "",
      getEnv("OAUTH_REDIRECT_URI") ??
        "http://localhost:8000/api/auth/google/callback",
    );
  }
  return google;
}

// Generate a random session ID
function generateSessionId(): string {
  return crypto.randomUUID();
}

// Parse cookies from request
function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    for (const pair of cookieHeader.split(";")) {
      const [name, ...rest] = pair.trim().split("=");
      if (name && rest.length > 0) {
        cookies.set(name, rest.join("="));
      }
    }
  }
  return cookies;
}

// Create a Set-Cookie header value
function createCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  } = {},
): string {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (options.secure !== false && isProduction()) {
    parts.push("Secure");
  }
  parts.push(`SameSite=${options.sameSite || "Lax"}`);

  return parts.join("; ");
}

// Create a cookie that deletes itself
function deleteCookie(name: string): string {
  return createCookie(name, "", { maxAge: 0 });
}

// Start OAuth sign-in flow
export function signIn(_request: Request): Response {
  try {
    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomUUID();

    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const url = getGoogleClient().createAuthorizationURL(state, codeVerifier, scopes);

    const headers = new Headers();
    headers.set("Location", url.toString());
    headers.append(
      "Set-Cookie",
      createCookie(OAUTH_STATE_COOKIE_NAME, state, {
        maxAge: 600, // 10 minutes
        httpOnly: true,
      }),
    );
    headers.append(
      "Set-Cookie",
      createCookie(OAUTH_VERIFIER_COOKIE_NAME, codeVerifier, {
        maxAge: 600,
        httpOnly: true,
      }),
    );

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error("[Auth] Sign in error:", error);
    return new Response("OAuth not configured", { status: 503 });
  }
}

// Handle OAuth callback
export async function handleCallback(request: Request): Promise<{
  response: Response;
  sessionId?: string;
  tokens?: { accessToken: string };
}> {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookies = parseCookies(request);
    const storedState = cookies.get(OAUTH_STATE_COOKIE_NAME);
    const codeVerifier = cookies.get(OAUTH_VERIFIER_COOKIE_NAME);

    // Validate state
    if (!code || !state || !storedState || state !== storedState) {
      return {
        response: new Response("Invalid OAuth state", { status: 400 }),
      };
    }

    if (!codeVerifier) {
      return {
        response: new Response("Missing code verifier", { status: 400 }),
      };
    }

    // Exchange code for tokens
    const tokens = await getGoogleClient().validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Create session
    const sessionId = generateSessionId();

    // Clear OAuth cookies in the response
    const headers = new Headers();
    headers.append("Set-Cookie", deleteCookie(OAUTH_STATE_COOKIE_NAME));
    headers.append("Set-Cookie", deleteCookie(OAUTH_VERIFIER_COOKIE_NAME));
    headers.append(
      "Set-Cookie",
      createCookie(SESSION_COOKIE_NAME, sessionId, {
        maxAge: SESSION_EXPIRY_MS / 1000,
        httpOnly: true,
      }),
    );
    headers.set("Location", "/");

    return {
      response: new Response(null, {
        status: 302,
        headers,
      }),
      sessionId,
      tokens: { accessToken },
    };
  } catch (error) {
    console.error("[Auth] Callback error:", error);
    return {
      response: new Response("OAuth callback failed", { status: 500 }),
    };
  }
}

// Sign out
export function signOut(_request: Request): Response {
  // Session will expire naturally in the database
  // Just clear the cookie to log out the user
  const headers = new Headers();
  headers.append("Set-Cookie", deleteCookie(SESSION_COOKIE_NAME));
  headers.set("Location", "/");

  return new Response(null, {
    status: 302,
    headers,
  });
}

// Get session ID from request
export function getSessionId(request: Request): string | undefined {
  const cookies = parseCookies(request);
  return cookies.get(SESSION_COOKIE_NAME);
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
  const sessionId = getSessionId(request);
  if (!sessionId) return null;

  const store = getStore();
  const userId = await store.getSession(sessionId);
  if (!userId) return null;

  return getUser(userId);
}
