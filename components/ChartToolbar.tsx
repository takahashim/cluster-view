import type { ChartType } from "@/lib/constants.ts";
import type { TranslationsData } from "@/lib/i18n/index.ts";

interface ChartToolbarProps {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  isFiltering: boolean;
  activeFilterCount: number;
  onFilterClick: () => void;
  onFullscreenClick?: () => void;
  strings: Pick<TranslationsData, "common" | "reportView">;
}

export default function ChartToolbar({
  chartType,
  onChartTypeChange,
  isFiltering,
  activeFilterCount,
  onFilterClick,
  onFullscreenClick,
  strings,
}: ChartToolbarProps) {
  return (
    <div class="flex items-center gap-2">
      <div class="join">
        <button
          type="button"
          class={`btn btn-sm join-item ${
            chartType === "scatterAll" ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => onChartTypeChange("scatterAll")}
        >
          {strings.reportView.chartTypes.all}
        </button>
        <button
          type="button"
          class={`btn btn-sm join-item ${
            chartType === "scatterDensity" ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => onChartTypeChange("scatterDensity")}
        >
          {strings.reportView.chartTypes.density}
        </button>
        <button
          type="button"
          class={`btn btn-sm join-item ${
            chartType === "treemap" ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => onChartTypeChange("treemap")}
        >
          {strings.reportView.chartTypes.tree}
        </button>
      </div>
      {/* フィルタボタン */}
      <button
        type="button"
        class={`btn btn-sm ${isFiltering ? "btn-secondary" : "btn-ghost"}`}
        onClick={onFilterClick}
        title={strings.reportView.filter.button}
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
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {activeFilterCount > 0 && (
          <span class="badge badge-sm">{activeFilterCount}</span>
        )}
      </button>
      {/* 全画面ボタン（フルスクリーン時は非表示） */}
      {onFullscreenClick && (
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          onClick={onFullscreenClick}
          title={strings.reportView.fullscreen}
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
      )}
    </div>
  );
}
