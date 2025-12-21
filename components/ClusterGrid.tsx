import type { Cluster } from "@/lib/types.ts";
import { getClusterColor } from "@/lib/colors.ts";
import ClusterCard from "./ClusterCard.tsx";

interface ClusterGridProps {
  clusters: Cluster[];
  onClusterClick?: (clusterId: string) => void;
}

export default function ClusterGrid({ clusters, onClusterClick }: ClusterGridProps) {
  const sortedClusters = [...clusters].sort((a, b) => b.value - a.value);

  return (
    <section class="mb-6">
      <h2 class="text-lg font-semibold mb-4">クラスタ一覧</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedClusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            color={getClusterColor(cluster.id)}
            onClick={onClusterClick ? () => onClusterClick(cluster.id) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
