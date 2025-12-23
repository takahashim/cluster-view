import type { Cluster } from "@/lib/types.ts";
import type { TranslationsData } from "@/lib/i18n/index.ts";

interface ClusterBreadcrumbProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onNavigate: (clusterId: string | null) => void;
  strings: Pick<TranslationsData, "common" | "reportView">;
}

export default function ClusterBreadcrumb({
  clusters,
  selectedClusterId,
  onNavigate,
  strings,
}: ClusterBreadcrumbProps) {
  if (!selectedClusterId) return null;

  // Build the path from root to selected cluster
  const buildPath = (): Cluster[] => {
    const path: Cluster[] = [];
    let currentId: string | null = selectedClusterId;

    while (currentId && currentId !== "0") {
      const cluster = clusters.find((c) => c.id === currentId);
      if (cluster) {
        path.unshift(cluster);
        currentId = cluster.parent;
      } else {
        break;
      }
    }

    return path;
  };

  const path = buildPath();

  if (path.length === 0) return null;

  return (
    <div class="mb-4 hidden md:block">
      <p class="text-sm font-semibold text-base-content/70 mb-1">
        {strings.reportView.breadcrumb.currentGroup}
      </p>
      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <button
              type="button"
              class="link link-hover"
              onClick={() => onNavigate(null)}
            >
              {strings.reportView.breadcrumb.all}
            </button>
          </li>
          {path.map((cluster, index) => (
            <li key={cluster.id}>
              {index === path.length - 1
                ? <span class="font-semibold">{cluster.label}</span>
                : (
                  <button
                    type="button"
                    class="link link-hover"
                    onClick={() => onNavigate(cluster.id)}
                  >
                    {cluster.label}
                  </button>
                )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
