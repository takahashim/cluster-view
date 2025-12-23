import { assertEquals, assertExists } from "@std/assert";
import {
  createI18nState,
  DEFAULT_LOCALE,
  detectLocale,
  detectLocaleFromHeader,
  getLocaleFromCookie,
  getTranslations,
  SUPPORTED_LOCALES,
} from "./index.ts";

// ============================================================
// detectLocaleFromHeader tests
// ============================================================

Deno.test("detectLocaleFromHeader", async (t) => {
  await t.step("returns default locale for null header", () => {
    const result = detectLocaleFromHeader(null);
    assertEquals(result, DEFAULT_LOCALE);
  });

  await t.step("returns default locale for empty string", () => {
    const result = detectLocaleFromHeader("");
    assertEquals(result, DEFAULT_LOCALE);
  });

  await t.step("detects 'ja' from simple header", () => {
    const result = detectLocaleFromHeader("ja");
    assertEquals(result, "ja");
  });

  await t.step("detects 'en' from simple header", () => {
    const result = detectLocaleFromHeader("en");
    assertEquals(result, "en");
  });

  await t.step("extracts language from locale with region (en-US)", () => {
    const result = detectLocaleFromHeader("en-US");
    assertEquals(result, "en");
  });

  await t.step("extracts language from locale with region (ja-JP)", () => {
    const result = detectLocaleFromHeader("ja-JP");
    assertEquals(result, "ja");
  });

  await t.step("respects q-value priority (higher q wins)", () => {
    const result = detectLocaleFromHeader("en;q=0.5,ja;q=0.9");
    assertEquals(result, "ja");
  });

  await t.step("treats missing q-value as q=1", () => {
    const result = detectLocaleFromHeader("ja,en;q=0.9");
    assertEquals(result, "ja");
  });

  await t.step("handles complex Accept-Language header", () => {
    const result = detectLocaleFromHeader(
      "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    );
    assertEquals(result, "en"); // fr not supported, falls back to en
  });

  await t.step("returns default for unsupported languages", () => {
    const result = detectLocaleFromHeader("fr-FR,de-DE");
    assertEquals(result, DEFAULT_LOCALE);
  });

  await t.step("handles whitespace in header", () => {
    const result = detectLocaleFromHeader("  en , ja;q=0.9  ");
    assertEquals(result, "en");
  });

  await t.step("is case-insensitive", () => {
    const result = detectLocaleFromHeader("EN-US");
    assertEquals(result, "en");
  });
});

// ============================================================
// getLocaleFromCookie tests
// ============================================================

Deno.test("getLocaleFromCookie", async (t) => {
  await t.step("returns null when no cookie header", () => {
    const req = new Request("http://example.com");
    const result = getLocaleFromCookie(req);
    assertEquals(result, null);
  });

  await t.step("returns null when locale cookie not present", () => {
    const req = new Request("http://example.com", {
      headers: { Cookie: "session=abc123; theme=dark" },
    });
    const result = getLocaleFromCookie(req);
    assertEquals(result, null);
  });

  await t.step("extracts 'ja' from cookie", () => {
    const req = new Request("http://example.com", {
      headers: { Cookie: "locale=ja" },
    });
    const result = getLocaleFromCookie(req);
    assertEquals(result, "ja");
  });

  await t.step("extracts 'en' from cookie", () => {
    const req = new Request("http://example.com", {
      headers: { Cookie: "locale=en" },
    });
    const result = getLocaleFromCookie(req);
    assertEquals(result, "en");
  });

  await t.step("extracts locale from multiple cookies", () => {
    const req = new Request("http://example.com", {
      headers: { Cookie: "session=abc; locale=en; theme=dark" },
    });
    const result = getLocaleFromCookie(req);
    assertEquals(result, "en");
  });

  await t.step("returns null for unsupported locale in cookie", () => {
    const req = new Request("http://example.com", {
      headers: { Cookie: "locale=fr" },
    });
    const result = getLocaleFromCookie(req);
    assertEquals(result, null);
  });
});

// ============================================================
// detectLocale tests
// ============================================================

Deno.test("detectLocale", async (t) => {
  await t.step("prioritizes cookie over Accept-Language", () => {
    const req = new Request("http://example.com", {
      headers: {
        Cookie: "locale=en",
        "Accept-Language": "ja",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "en");
  });

  await t.step("falls back to Accept-Language when no cookie", () => {
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "en-US",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "en");
  });

  await t.step("returns default locale when neither cookie nor header", () => {
    const req = new Request("http://example.com");
    const result = detectLocale(req);
    assertEquals(result, DEFAULT_LOCALE);
  });

  await t.step("ignores invalid cookie and uses Accept-Language", () => {
    const req = new Request("http://example.com", {
      headers: {
        Cookie: "locale=invalid",
        "Accept-Language": "en",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "en");
  });
});

// ============================================================
// getTranslations tests
// ============================================================

Deno.test("getTranslations", async (t) => {
  await t.step("returns translations object for ja", () => {
    const translations = getTranslations("ja");
    assertEquals(typeof translations, "object");
    assertEquals(typeof translations.common, "object");
  });

  await t.step("returns translations object for en", () => {
    const translations = getTranslations("en");
    assertEquals(typeof translations, "object");
    assertEquals(typeof translations.common, "object");
  });

  await t.step("returns correct value for nested key", () => {
    const translations = getTranslations("ja");
    const common = translations.common as Record<string, string>;
    assertEquals(common.appName, "Cluster View");
  });
});

// ============================================================
// Browser auto-detection integration tests
// ============================================================

Deno.test("browser auto-detection scenarios", async (t) => {
  await t.step("Japanese Chrome browser → ja", () => {
    // Real Chrome on Japanese Windows
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "ja");
  });

  await t.step("English Chrome browser → en", () => {
    // Real Chrome on English Windows
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "en");
  });

  await t.step("Japanese Safari browser → ja", () => {
    // Real Safari on Japanese macOS
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "ja");
  });

  await t.step("French browser (unsupported) → fallback to default", () => {
    // French browser - unsupported language
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, DEFAULT_LOCALE); // Falls back to ja
  });

  await t.step("German browser with English secondary → en", () => {
    // German browser with English as secondary
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "en"); // de not supported, falls back to en
  });

  await t.step("Chinese browser with Japanese secondary → ja", () => {
    // Chinese browser with Japanese as secondary
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "ja"); // zh not supported, falls back to ja
  });

  await t.step("user cookie overrides browser language", () => {
    // Japanese browser but user selected English
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "ja,en;q=0.9",
        Cookie: "locale=en",
      },
    });
    const result = detectLocale(req);
    assertEquals(result, "en"); // Cookie takes priority
  });

  await t.step("no Accept-Language header → default locale", () => {
    // Some bots or old clients may not send Accept-Language
    const req = new Request("http://example.com");
    const result = detectLocale(req);
    assertEquals(result, DEFAULT_LOCALE);
  });
});

// ============================================================
// createI18nState tests (middleware core logic)
// ============================================================

Deno.test("createI18nState - middleware core logic", async (t) => {
  await t.step("returns complete i18n state object", () => {
    const req = new Request("http://example.com", {
      headers: { "Accept-Language": "ja" },
    });
    const state = createI18nState(req);

    assertExists(state.locale);
    assertExists(state.translations);
  });

  await t.step("state.locale matches detected locale", () => {
    const req = new Request("http://example.com", {
      headers: { "Accept-Language": "en-US" },
    });
    const state = createI18nState(req);

    assertEquals(state.locale, "en");
  });

  await t.step("state.translations contains translation data", () => {
    const req = new Request("http://example.com", {
      headers: { "Accept-Language": "en" },
    });
    const state = createI18nState(req);

    assertEquals(typeof state.translations, "object");
    assertEquals(typeof state.translations.common, "object");
  });

  await t.step("Japanese browser gets Japanese translations", () => {
    const req = new Request("http://example.com", {
      headers: { "Accept-Language": "ja,en;q=0.9" },
    });
    const state = createI18nState(req);

    assertEquals(state.locale, "ja");
    assertEquals(state.translations.common.login, "Googleでログイン");
  });

  await t.step("English browser gets English translations", () => {
    const req = new Request("http://example.com", {
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    const state = createI18nState(req);

    assertEquals(state.locale, "en");
    assertEquals(state.translations.common.login, "Sign in with Google");
  });

  await t.step("Cookie preference overrides browser language", () => {
    const req = new Request("http://example.com", {
      headers: {
        "Accept-Language": "ja",
        Cookie: "locale=en",
      },
    });
    const state = createI18nState(req);

    assertEquals(state.locale, "en");
    assertEquals(state.translations.common.logout, "Sign out");
  });

  await t.step("state is consistent (all parts use same locale)", () => {
    const req = new Request("http://example.com", {
      headers: { "Accept-Language": "en" },
    });
    const state = createI18nState(req);

    // Verify locale
    assertEquals(state.locale, "en");

    // Verify translations object is en
    assertEquals(state.translations.common.login, "Sign in with Google");
  });
});

// ============================================================
// Config constants tests
// ============================================================

Deno.test("config constants", async (t) => {
  await t.step("SUPPORTED_LOCALES includes ja and en", () => {
    assertEquals(SUPPORTED_LOCALES.includes("ja"), true);
    assertEquals(SUPPORTED_LOCALES.includes("en"), true);
  });

  await t.step("DEFAULT_LOCALE is ja", () => {
    assertEquals(DEFAULT_LOCALE, "ja");
  });
});
