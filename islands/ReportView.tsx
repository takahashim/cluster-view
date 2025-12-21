import { useSignal } from "@preact/signals";
import type { HierarchicalResult, Cluster } from "@/lib/types.ts";
import Overview from "@/components/Overview.tsx";
import ClusterGrid from "@/components/ClusterGrid.tsx";
import ScatterPlot from "./ScatterPlot.tsx";

interface ReportViewProps {
  data: HierarchicalResult;
  title: string;
  shareToken: string;
}

export default function ReportView({ data, title, shareToken }: ReportViewProps) {
  const selectedClusterId = useSignal<string | null>(null);
  const copied = useSignal(false);

  // Get level 1 clusters
  const level1Clusters = data.clusters.filter((c) => c.level === 1);

  // Get children of selected cluster
  const getChildClusters = (parentId: string): Cluster[] => {
    return data.clusters
      .filter((c) => c.parent === parentId)
      .sort((a, b) => b.value - a.value);
  };

  // Get cluster by ID
  const getClusterById = (id: string): Cluster | undefined => {
    return data.clusters.find((c) => c.id === id);
  };

  const handleClusterClick = (clusterId: string) => {
    const children = getChildClusters(clusterId);
    if (children.length > 0) {
      selectedClusterId.value = clusterId;
    }
  };

  const handleBackClick = () => {
    const current = getClusterById(selectedClusterId.value || "");
    if (current && current.parent && current.parent !== "0") {
      selectedClusterId.value = current.parent;
    } else {
      selectedClusterId.value = null;
    }
  };

  const copyShareUrl = async () => {
    const url = `${globalThis.location.origin}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const commentCount = data.comment_num || Object.keys(data.comments).length;
  const selectedCluster = selectedClusterId.value
    ? getClusterById(selectedClusterId.value)
    : null;
  const displayClusters = selectedClusterId.value
    ? getChildClusters(selectedClusterId.value)
    : level1Clusters;

  return (
    <div class="report-container">
      <header class="report-header">
        <a href="/" class="back-home">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Broadlistening</span>
        </a>
        <button class="share-button" onClick={copyShareUrl}>
          {copied.value ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              コピーしました
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              URLをコピー
            </>
          )}
        </button>
      </header>

      <main class="report-main">
        <Overview
          title={title}
          commentCount={commentCount}
          overview={data.overview}
        />

        <section class="plot-section">
          <h2 class="section-title">意見の分布</h2>
          <ScatterPlot
            arguments={data.arguments}
            clusters={data.clusters}
            selectedClusterId={selectedClusterId.value}
          />
        </section>

        {selectedCluster && (
          <div class="breadcrumb">
            <button class="back-button" onClick={handleBackClick}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              戻る
            </button>
            <span class="current-cluster">{selectedCluster.label}</span>
          </div>
        )}

        {displayClusters.length > 0 && (
          <ClusterGrid
            clusters={displayClusters}
            onClusterClick={handleClusterClick}
          />
        )}
      </main>

      <style>{`
        .report-container {
          min-height: 100vh;
          background: #f1f5f9;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .back-home {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1e293b;
          text-decoration: none;
          font-weight: 600;
        }

        .back-home:hover {
          color: #3b82f6;
        }

        .share-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .share-button:hover {
          background: #2563eb;
        }

        .report-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .plot-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 16px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .current-cluster {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        @media (max-width: 640px) {
          .report-header {
            padding: 12px 16px;
          }

          .report-main {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
