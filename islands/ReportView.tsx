import { useSignal } from "@preact/signals";
import type { Cluster, HierarchicalResult } from "@/lib/types.ts";
import Overview from "@/components/Overview.tsx";
import ClusterGrid from "@/components/ClusterGrid.tsx";
import ScatterPlot from "./ScatterPlot.tsx";
import TreemapChart from "./TreemapChart.tsx";

interface ReportViewProps {
  data: HierarchicalResult;
  title: string;
  shareToken: string;
}

type ChartType = "scatterAll" | "scatterDensity" | "treemap";

export default function ReportView(
  { data, title, shareToken }: ReportViewProps,
) {
  const selectedClusterId = useSignal<string | null>(null);
  const copied = useSignal(false);
  const chartType = useSignal<ChartType>("scatterAll");
  const isFullscreen = useSignal(false);
  const treemapLevel = useSignal("0"); // Treemapのズームレベル

  // 最大レベルを計算（密度表示用）
  const maxLevel = Math.max(...data.clusters.map((c) => c.level));

  // Treemapズーム用のハンドラ
  const handleTreeZoom = (level: string) => {
    treemapLevel.value = level;
  };

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
            <span>Cluster View</span>
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
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 class="card-title text-lg">意見の分布</h2>
              <div class="flex items-center gap-2">
                <div class="join">
                  <button
                    type="button"
                    class={`btn btn-sm join-item ${chartType.value === "scatterAll" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      chartType.value = "scatterAll";
                      selectedClusterId.value = null;
                    }}
                  >
                    全体
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm join-item ${chartType.value === "scatterDensity" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      chartType.value = "scatterDensity";
                      selectedClusterId.value = null;
                    }}
                  >
                    密度
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm join-item ${chartType.value === "treemap" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      chartType.value = "treemap";
                      selectedClusterId.value = null;
                      treemapLevel.value = "0";
                    }}
                  >
                    ツリー
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  onClick={() => {
                    isFullscreen.value = true;
                  }}
                  title="全画面表示"
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
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              </div>
            </div>
            {chartType.value === "treemap" ? (
              <TreemapChart
                arguments={data.arguments}
                clusters={data.clusters}
                level={treemapLevel.value}
                onTreeZoom={handleTreeZoom}
              />
            ) : (
              <ScatterPlot
                arguments={data.arguments}
                clusters={data.clusters}
                selectedClusterId={selectedClusterId.value}
                targetLevel={chartType.value === "scatterAll" ? 1 : maxLevel}
              />
            )}
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

      {/* フルスクリーンモーダル */}
      {isFullscreen.value && (
        <div class="modal modal-open">
          <div class="modal-box w-full max-w-none h-screen max-h-none rounded-none p-0 m-0">
            <div class="relative w-full h-full bg-base-100">
              {/* 閉じるボタン */}
              <button
                type="button"
                class="btn btn-sm btn-ghost absolute top-4 right-4 z-10"
                onClick={() => {
                  isFullscreen.value = false;
                }}
                title="全画面を終了"
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
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>

              {/* 表示切り替えボタン */}
              <div class="absolute top-4 left-4 z-10">
                <div class="join">
                  <button
                    type="button"
                    class={`btn btn-sm join-item ${chartType.value === "scatterAll" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      chartType.value = "scatterAll";
                      selectedClusterId.value = null;
                    }}
                  >
                    全体
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm join-item ${chartType.value === "scatterDensity" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      chartType.value = "scatterDensity";
                      selectedClusterId.value = null;
                    }}
                  >
                    密度
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm join-item ${chartType.value === "treemap" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      chartType.value = "treemap";
                      selectedClusterId.value = null;
                      treemapLevel.value = "0";
                    }}
                  >
                    ツリー
                  </button>
                </div>
              </div>

              {/* フルスクリーンチャート */}
              <div class="w-full h-full pt-16 pb-4">
                {chartType.value === "treemap" ? (
                  <TreemapChart
                    arguments={data.arguments}
                    clusters={data.clusters}
                    level={treemapLevel.value}
                    onTreeZoom={handleTreeZoom}
                    fullHeight={true}
                  />
                ) : (
                  <ScatterPlot
                    arguments={data.arguments}
                    clusters={data.clusters}
                    selectedClusterId={selectedClusterId.value}
                    targetLevel={chartType.value === "scatterAll" ? 1 : maxLevel}
                    fullHeight={true}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
