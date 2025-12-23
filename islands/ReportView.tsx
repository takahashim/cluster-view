import type { ComponentChildren } from "preact";
import { useComputed, useSignal } from "@preact/signals";
import type { Cluster, FilterState, HierarchicalResult } from "@/lib/types.ts";
import {
  interpolateTemplate,
  type Locale,
  type TranslationsData,
} from "@/lib/i18n/index.ts";
import {
  type ChartType,
  DEFAULT_MAX_DENSITY,
  DEFAULT_MIN_VALUE,
} from "@/lib/constants.ts";
import ClusterGrid from "@/components/ClusterGrid.tsx";
import ClusterBreadcrumb from "@/components/ClusterBreadcrumb.tsx";
import ChartToolbar from "@/components/ChartToolbar.tsx";
import ScatterPlot from "./ScatterPlot.tsx";
import TreemapChart from "./TreemapChart.tsx";
import FilterPanel, {
  applyFilters,
  createDefaultFilterState,
} from "./FilterPanel.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";

type ReportStrings = Pick<TranslationsData, "common" | "reportView">;

interface ReportViewProps {
  data: HierarchicalResult;
  shareToken: string;
  strings: ReportStrings;
  locale: Locale;
  children: ComponentChildren;
}

export default function ReportView(
  { data, shareToken, strings, locale, children }: ReportViewProps,
) {
  const selectedClusterId = useSignal<string | null>(null);
  const copied = useSignal(false);
  const chartType = useSignal<ChartType>("scatterAll");
  const isFullscreen = useSignal(false);
  const treemapLevel = useSignal("0");
  const isFilterPanelOpen = useSignal(false);

  // フィルタ状態
  const filterState = useSignal(createDefaultFilterState());

  // 最大レベル
  const maxLevel = Math.max(...data.clusters.map((c) => c.level));

  // ソースリンク機能が有効かどうか
  const enableSourceLink = data.config?.enable_source_link === true;

  // フィルタ結果を計算
  const filterResult = useComputed(() => {
    return applyFilters(data.arguments, data.clusters, filterState.value, {
      applyDensityFilter: chartType.value === "scatterDensity",
    });
  });

  // フィルタが適用中かどうか
  const isFiltering = useComputed(() => filterResult.value.isFiltering);

  // フィルタ適用後の引数ID
  const filteredArgumentIds = useComputed(() =>
    filterResult.value.filteredArgumentIds
  );

  // 密度ビュー用のフィルタ済みクラスタID
  const filteredClusterIds = useComputed(() =>
    filterResult.value.filteredClusterIds
  );

  // Treemapズーム用のハンドラ
  const handleTreeZoom = (level: string) => {
    treemapLevel.value = level;
  };

  // フィルタ変更ハンドラ
  const handleFilterChange = (newState: FilterState) => {
    filterState.value = newState;
  };

  // チャートタイプ変更ハンドラ
  const handleChartTypeChange = (type: ChartType) => {
    chartType.value = type;
    selectedClusterId.value = null;
    if (type === "treemap") {
      treemapLevel.value = "0";
    }
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

  const selectedCluster = selectedClusterId.value
    ? getClusterById(selectedClusterId.value)
    : null;

  // 表示するクラスタを計算
  const displayClusters = (() => {
    if (selectedClusterId.value) {
      return getChildClusters(selectedClusterId.value);
    }

    if (chartType.value === "scatterDensity") {
      // 密度ビュー: 最深レベルのクラスタでフィルタ適用
      const deepestLevelClusters = data.clusters.filter((c) =>
        c.level === maxLevel
      );
      return deepestLevelClusters
        .filter((c) => filteredClusterIds.value.has(c.id))
        .sort((a, b) => b.value - a.value);
    }

    return level1Clusters;
  })();

  // アクティブなフィルタ数を計算
  const activeFilterCount = useComputed(() => {
    let count = 0;
    if (filterState.value.textSearch.trim() !== "") count++;
    if (filterState.value.maxDensity !== DEFAULT_MAX_DENSITY) count++;
    if (filterState.value.minValue !== DEFAULT_MIN_VALUE) count++;
    for (const values of Object.values(filterState.value.attributeFilters)) {
      if (values.length > 0) count++;
    }
    // 数値範囲フィルタ
    for (const isEnabled of Object.values(filterState.value.enabledRanges)) {
      if (isEnabled) count++;
    }
    return count;
  });

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
            <span>{strings.common.appName}</span>
          </a>
        </div>
        <div class="flex-none flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale} />
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
                  {strings.reportView.copied}
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
                  {strings.reportView.copyUrl}
                </>
              )}
          </button>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-4 md:p-6">
        {children}

        <section class="card bg-base-100 shadow-sm mb-6">
          <div class="card-body">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 class="card-title text-lg">
                {strings.reportView.distribution}
              </h2>
              <ChartToolbar
                chartType={chartType.value}
                onChartTypeChange={handleChartTypeChange}
                isFiltering={isFiltering.value}
                activeFilterCount={activeFilterCount.value}
                onFilterClick={() => {
                  isFilterPanelOpen.value = true;
                }}
                onFullscreenClick={() => {
                  isFullscreen.value = true;
                }}
                strings={strings}
              />
            </div>

            {/* フィルタ適用中の表示 */}
            {isFiltering.value && (
              <div class="alert alert-info py-2 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span class="text-sm">
                  {interpolateTemplate(strings.reportView.filter.active, {
                    filtered: filteredArgumentIds.value.size,
                    total: data.arguments.length,
                  })}
                </span>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost"
                  onClick={() => {
                    filterState.value = createDefaultFilterState();
                  }}
                >
                  {strings.common.clear}
                </button>
              </div>
            )}

            {chartType.value === "treemap"
              ? (
                <TreemapChart
                  arguments={data.arguments}
                  clusters={data.clusters}
                  level={treemapLevel.value}
                  onTreeZoom={handleTreeZoom}
                  filteredArgumentIds={isFiltering.value
                    ? filteredArgumentIds.value
                    : undefined}
                  filteredClusterIds={isFiltering.value
                    ? filteredClusterIds.value
                    : undefined}
                />
              )
              : (
                <ScatterPlot
                  arguments={data.arguments}
                  clusters={data.clusters}
                  selectedClusterId={selectedClusterId.value}
                  targetLevel={chartType.value === "scatterAll" ? 1 : maxLevel}
                  filteredArgumentIds={isFiltering.value
                    ? filteredArgumentIds.value
                    : undefined}
                  filteredClusterIds={chartType.value === "scatterDensity"
                    ? filteredClusterIds.value
                    : undefined}
                  enableSourceLink={enableSourceLink}
                />
              )}
          </div>
        </section>

        <ClusterBreadcrumb
          clusters={data.clusters}
          selectedClusterId={selectedClusterId.value}
          onNavigate={(id) => {
            selectedClusterId.value = id;
          }}
          strings={strings}
        />

        {selectedCluster && (
          <div class="flex items-center gap-3 mb-4 md:hidden">
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
              {strings.reportView.backToList}
            </button>
            <span class="text-lg font-semibold">{selectedCluster.label}</span>
          </div>
        )}

        {displayClusters.length > 0 && (
          <ClusterGrid
            clusters={displayClusters}
            onClusterClick={handleClusterClick}
            strings={strings}
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
                title={strings.reportView.exitFullscreen}
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
                <ChartToolbar
                  chartType={chartType.value}
                  onChartTypeChange={handleChartTypeChange}
                  isFiltering={isFiltering.value}
                  activeFilterCount={activeFilterCount.value}
                  onFilterClick={() => {
                    isFilterPanelOpen.value = true;
                  }}
                  strings={strings}
                />
              </div>

              {/* フルスクリーンチャート */}
              <div class="w-full h-full pt-16 pb-4">
                {chartType.value === "treemap"
                  ? (
                    <TreemapChart
                      arguments={data.arguments}
                      clusters={data.clusters}
                      level={treemapLevel.value}
                      onTreeZoom={handleTreeZoom}
                      fullHeight
                      filteredArgumentIds={isFiltering.value
                        ? filteredArgumentIds.value
                        : undefined}
                      filteredClusterIds={isFiltering.value
                        ? filteredClusterIds.value
                        : undefined}
                    />
                  )
                  : (
                    <ScatterPlot
                      arguments={data.arguments}
                      clusters={data.clusters}
                      selectedClusterId={selectedClusterId.value}
                      targetLevel={chartType.value === "scatterAll"
                        ? 1
                        : maxLevel}
                      fullHeight
                      filteredArgumentIds={isFiltering.value
                        ? filteredArgumentIds.value
                        : undefined}
                      filteredClusterIds={chartType.value === "scatterDensity"
                        ? filteredClusterIds.value
                        : undefined}
                      enableSourceLink={enableSourceLink}
                    />
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フィルタパネル */}
      <FilterPanel
        arguments={data.arguments}
        clusters={data.clusters}
        isOpen={isFilterPanelOpen.value}
        onClose={() => {
          isFilterPanelOpen.value = false;
        }}
        filterState={filterState.value}
        onFilterChange={handleFilterChange}
        strings={strings}
      />
    </div>
  );
}
