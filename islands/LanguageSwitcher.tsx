/**
 * Language Switcher Island
 *
 * Allows users to manually switch between supported languages.
 * Stores preference in a cookie for persistence.
 */

import {
  type Locale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/index.ts";

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

export default function LanguageSwitcher(
  { currentLocale }: LanguageSwitcherProps,
) {
  const handleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Save preference to cookie
    document.cookie =
      `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;

    // Reload page to apply new locale
    globalThis.location.reload();
  };

  return (
    <div class="dropdown dropdown-end">
      <label
        tabIndex={0}
        class="btn btn-ghost btn-sm gap-1"
        aria-label="Switch language"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        <span class="hidden sm:inline">{LOCALE_NAMES[currentLocale]}</span>
      </label>
      <ul
        tabIndex={0}
        class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-36 z-50"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <li key={locale}>
            <button
              type="button"
              class={currentLocale === locale ? "active" : ""}
              onClick={() => handleChange(locale)}
            >
              {LOCALE_NAMES[locale]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
