import { useTranslation } from "@/lib/i18n/hooks.ts";
import type { Translations } from "@/lib/i18n/types.ts";

interface OverviewProps {
  title: string;
  commentCount: number;
  overview: string;
  translations: Translations;
}

export default function Overview(
  { title, commentCount, overview, translations }: OverviewProps,
) {
  const t = useTranslation(translations);

  return (
    <div class="card bg-base-100 shadow-sm mb-6">
      <div class="card-body">
        <h1 class="card-title text-2xl">{title}</h1>
        <div class="flex items-center gap-2 text-base-content/60 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>
            {t("common.comments", { count: commentCount.toLocaleString() })}
          </span>
        </div>
        <p class="mt-4 leading-relaxed">{overview}</p>
      </div>
    </div>
  );
}
