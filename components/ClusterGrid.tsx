import type { Cluster } from "@/lib/types.ts";
import { getClusterColor } from "@/lib/colors.ts";
import ClusterCard from "./ClusterCard.tsx";

interface ClusterGridProps {
  clusters: Cluster[];
  onClusterClick?: (clusterId: string) => void;
}

export default function ClusterGrid({ clusters, onClusterClick }: ClusterGridProps) {
  // Sort clusters by value (descending)
  const sortedClusters = [...clusters].sort((a, b) => b.value - a.value);

  return (
    <section class="cluster-section">
      <h2 class="section-title">クラスタ一覧</h2>
      <div class="cluster-grid">
        {sortedClusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            color={getClusterColor(cluster.id)}
            onClick={onClusterClick ? () => onClusterClick(cluster.id) : undefined}
          />
        ))}
      </div>

      <style>{`
        .cluster-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 16px;
        }

        .cluster-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        @media (max-width: 640px) {
          .cluster-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
