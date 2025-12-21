import { useSignal } from "@preact/signals";
import type { Cluster, HierarchicalResult } from "@/lib/types.ts";
import Overview from "@/components/Overview.tsx";
import ClusterGrid from "@/components/ClusterGrid.tsx";
import ScatterPlot from "./ScatterPlot.tsx";

interface ReportViewProps {
  data: HierarchicalResult;
  title: string;
  shareToken: string;
}

export default function ReportView(
  { data, title, shareToken }: ReportViewProps,
) {
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
    <div class="min-h-screen bg-base-200">
      <header class="navbar bg-base-100 shadow-sm sticky top-0 z-50 px-4 md:px-6">
        <div class="flex-1">
          <a
            href="/"
            class="flex items-center gap-2 text-base-content font-semibold hover:text-primary transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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
        </div>
        <div class="flex-none">
          <button
            type="button"
            class="btn btn-primary btn-sm gap-2"
            onClick={copyShareUrl}
          >
            {copied.value
              ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
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
              )
              : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
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
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-4 md:p-6">
        <Overview
          title={title}
          commentCount={commentCount}
          overview={data.overview}
        />

        <section class="card bg-base-100 shadow-sm mb-6">
          <div class="card-body">
            <h2 class="card-title text-lg">意見の分布</h2>
            <ScatterPlot
              arguments={data.arguments}
              clusters={data.clusters}
              selectedClusterId={selectedClusterId.value}
            />
          </div>
        </section>

        {selectedCluster && (
          <div class="flex items-center gap-3 mb-4">
            <button
              type="button"
              class="btn btn-outline btn-sm gap-2"
              onClick={handleBackClick}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              一覧に戻る
            </button>
            <span class="text-lg font-semibold">{selectedCluster.label}</span>
          </div>
        )}

        {displayClusters.length > 0 && (
          <ClusterGrid
            clusters={displayClusters}
            onClusterClick={handleClusterClick}
          />
        )}
      </main>
    </div>
  );
}
