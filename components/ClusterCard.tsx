import type { Cluster } from "@/lib/types.ts";
import { useTranslation } from "@/lib/i18n/hooks.ts";
import type { Translations } from "@/lib/i18n/types.ts";

interface ClusterCardProps {
  cluster: Cluster;
  color: string;
  onClick?: () => void;
  translations: Translations;
}

export default function ClusterCard(
  { cluster, color, onClick, translations }: ClusterCardProps,
) {
  const t = useTranslation(translations);
  return (
    <div
      class="card bg-base-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: color }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          onClick();
        }
      }}
    >
      <div class="card-body p-4">
        <div class="flex items-start justify-between gap-3">
          <h3 class="card-title text-base">{cluster.label}</h3>
          <span
            class="px-2 py-1 text-xs font-medium text-white rounded-full shrink-0"
            style={{ backgroundColor: color }}
          >
            {t("common.items", { count: cluster.value })}
          </span>
        </div>
        <p class="text-sm text-base-content/70 line-clamp-3">
          {cluster.takeaway}
        </p>
      </div>
    </div>
  );
}
