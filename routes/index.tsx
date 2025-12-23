import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { getCurrentUser } from "@/lib/auth.ts";
import type { User } from "@/lib/repository.ts";
import type { HomePageStrings } from "@/lib/i18n/index.ts";
import FileUploader from "../islands/FileUploader.tsx";
import Header from "@/components/Header.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const user = await getCurrentUser(ctx.req);
    const translations = ctx.state.translations;
    const strings: HomePageStrings = {
      common: translations.common as HomePageStrings["common"],
      uploader: translations.uploader as HomePageStrings["uploader"],
    };
    return {
      data: {
        user,
        locale: ctx.state.locale,
        strings,
      },
    };
  },
});

export default define.page<typeof handler>(function Home({ data, state }) {
  const user = data.user as User | null;
  const { t, locale } = state;

  return (
    <div class="min-h-screen bg-base-200">
      <Head>
        <title>{t("home.title")}</title>
        <meta name="description" content={t("home.description")} />
      </Head>

      <Header user={user} t={t} locale={locale} />

      <main class="max-w-3xl mx-auto p-6 md:p-10">
        <div class="text-center mb-12">
          <h1 class="text-4xl md:text-5xl font-bold text-base-content mb-4">
            {t("common.appName")}
          </h1>
          <p class="text-lg text-base-content/70">
            <a
              href="https://dd2030.org/kouchou-ai/"
              class="link link-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("home.kouchouAi")}
            </a>
            {t("home.subtitle")}
          </p>
        </div>

        <FileUploader
          user={user}
          strings={data.strings}
        />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body items-center text-center">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke-width="2" />
                  <circle cx="12" cy="12" r="3" stroke-width="2" />
                </svg>
              </div>
              <h3 class="card-title text-base">
                {t("home.features.visualization.title")}
              </h3>
              <p class="text-base-content/60 text-sm">
                {t("home.features.visualization.description")}
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body items-center text-center">
              <div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3 class="card-title text-base">
                {t("home.features.cluster.title")}
              </h3>
              <p class="text-base-content/60 text-sm">
                {t("home.features.cluster.description")}
              </p>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body items-center text-center">
              <div class="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <h3 class="card-title text-base">
                {t("home.features.share.title")}
              </h3>
              <p class="text-base-content/60 text-sm">
                {t("home.features.share.description")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});
