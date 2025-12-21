import type { Cluster } from "@/lib/types.ts";

interface ClusterBreadcrumbProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onNavigate: (clusterId: string | null) => void;
}

export default function ClusterBreadcrumb({
  clusters,
  selectedClusterId,
  onNavigate,
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
        表示中の意見グループ
      </p>
      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <button
              type="button"
              class="link link-hover"
              onClick={() => onNavigate(null)}
            >
              全て
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
