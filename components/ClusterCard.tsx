import type { Cluster } from "@/lib/types.ts";

interface ClusterCardProps {
  cluster: Cluster;
  color: string;
  onClick?: () => void;
}

export default function ClusterCard({ cluster, color, onClick }: ClusterCardProps) {
  return (
    <div
      class="cluster-card"
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
      <div class="cluster-header">
        <h3 class="cluster-label">{cluster.label}</h3>
        <span class="cluster-count" style={{ backgroundColor: color }}>
          {cluster.value}件
        </span>
      </div>
      <p class="cluster-takeaway">{cluster.takeaway}</p>

      <style>{`
        .cluster-card {
          background: white;
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .cluster-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .cluster-card:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .cluster-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .cluster-label {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          flex: 1;
        }

        .cluster-count {
          font-size: 12px;
          font-weight: 500;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          white-space: nowrap;
        }

        .cluster-takeaway {
          font-size: 14px;
          line-height: 1.6;
          color: #64748b;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
