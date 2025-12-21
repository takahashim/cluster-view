import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import type { Argument, Cluster, FilterState } from "@/lib/types.ts";
import { DEFAULT_MAX_DENSITY, DEFAULT_MIN_VALUE } from "@/lib/constants.ts";

// デフォルトのフィルタ状態を作成
export function createDefaultFilterState(): FilterState {
  return {
    textSearch: "",
    maxDensity: DEFAULT_MAX_DENSITY,
    minValue: DEFAULT_MIN_VALUE,
    attributeFilters: {},
    numericRanges: {},
    enabledRanges: {},
    includeEmptyValues: {},
  };
}

// 属性のメタデータ
interface AttributeMeta {
  name: string;
  type: "numeric" | "categorical";
  values: string[];
  valueCounts: Record<string, number>;
  numericRange?: [number, number];
}

interface FilterPanelProps {
  arguments: Argument[];
  clusters: Cluster[];
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
}

export default function FilterPanel({
  arguments: args,
  clusters,
  isOpen,
  onClose,
  filterState,
  onFilterChange,
}: FilterPanelProps) {
  // 属性メタデータを計算
  const attributeMetas = useComputed<AttributeMeta[]>(() => {
    const attrMap: Record<string, {
      valueSet: Set<string>;
      valueCounts: Map<string, number>;
      isNumeric: boolean;
      min?: number;
      max?: number;
    }> = {};

    for (const arg of args) {
      if (!arg.attributes) continue;
      for (const [name, rawValue] of Object.entries(arg.attributes)) {
        const value = rawValue == null ? "" : String(rawValue);
        if (!attrMap[name]) {
          attrMap[name] = {
            valueSet: new Set(),
            valueCounts: new Map(),
            isNumeric: true,
          };
        }
        attrMap[name].valueSet.add(value);
        attrMap[name].valueCounts.set(
          value,
          (attrMap[name].valueCounts.get(value) ?? 0) + 1,
        );
        if (value.trim() !== "") {
          const num = Number(value);
          if (Number.isNaN(num)) {
            attrMap[name].isNumeric = false;
          } else if (attrMap[name].isNumeric) {
            if (attrMap[name].min === undefined || num < attrMap[name].min) {
              attrMap[name].min = num;
            }
            if (attrMap[name].max === undefined || num > attrMap[name].max) {
              attrMap[name].max = num;
            }
          }
        }
      }
    }

    return Object.entries(attrMap).map(([name, info]) => {
      const values = Array.from(info.valueSet).filter((v) => v !== "").sort();
      const valueCounts: Record<string, number> = {};
      for (const v of values) valueCounts[v] = info.valueCounts.get(v) ?? 0;
      let numericRange: [number, number] | undefined = undefined;
      if (
        info.isNumeric && values.length > 0 && info.min !== undefined &&
        info.max !== undefined
      ) {
        numericRange = [info.min, info.max];
      }
      return {
        name,
        type: info.isNumeric ? "numeric" as const : "categorical" as const,
        values,
        valueCounts,
        numericRange,
      };
    });
  });

  // 密度フィルタが利用可能か（データにdensity_rank_percentileがあるか）
  const hasDensityData = clusters.some((c) =>
    c.density_rank_percentile !== undefined
  );

  // ローカル状態（編集中）
  const localTextSearch = useSignal(filterState.textSearch);
  const localMaxDensity = useSignal(filterState.maxDensity);
  const localMinValue = useSignal(filterState.minValue);
  const localAttributeFilters = useSignal<Record<string, string[]>>({
    ...filterState.attributeFilters,
  });
  const localNumericRanges = useSignal<Record<string, [number, number]>>({
    ...filterState.numericRanges,
  });
  const localEnabledRanges = useSignal<Record<string, boolean>>({
    ...filterState.enabledRanges,
  });
  const localIncludeEmptyValues = useSignal<Record<string, boolean>>({
    ...filterState.includeEmptyValues,
  });

  // 親のfilterStateが変更されたらローカル状態を同期
  // (例: ReportViewの「クリア」ボタンが押された場合)
  const syncLocalState = (state: FilterState) => {
    localTextSearch.value = state.textSearch;
    localMaxDensity.value = state.maxDensity;
    localMinValue.value = state.minValue;
    localAttributeFilters.value = { ...state.attributeFilters };
    localNumericRanges.value = { ...state.numericRanges };
    localEnabledRanges.value = { ...state.enabledRanges };
    localIncludeEmptyValues.value = { ...state.includeEmptyValues };
  };

  // モーダルが開かれたときに親の状態を同期
  useSignalEffect(() => {
    if (isOpen) {
      syncLocalState(filterState);
    }
  });

  const handleApply = () => {
    onFilterChange({
      textSearch: localTextSearch.value,
      maxDensity: localMaxDensity.value,
      minValue: localMinValue.value,
      attributeFilters: localAttributeFilters.value,
      numericRanges: localNumericRanges.value,
      enabledRanges: localEnabledRanges.value,
      includeEmptyValues: localIncludeEmptyValues.value,
    });
    onClose();
  };

  const handleReset = () => {
    const defaultState = createDefaultFilterState();
    syncLocalState(defaultState);
    onFilterChange(defaultState);
  };

  const toggleAttributeValue = (attrName: string, value: string) => {
    const current = localAttributeFilters.value[attrName] || [];
    if (current.includes(value)) {
      const updated = current.filter((v) => v !== value);
      localAttributeFilters.value = {
        ...localAttributeFilters.value,
        [attrName]: updated,
      };
    } else {
      localAttributeFilters.value = {
        ...localAttributeFilters.value,
        [attrName]: [...current, value],
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div class="modal modal-open">
      <div class="modal-box max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 class="font-bold text-lg mb-4">フィルタ設定</h3>

        {/* テキスト検索 */}
        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-semibold">テキスト検索</span>
          </label>
          <input
            type="text"
            placeholder="意見の内容で検索..."
            class="input input-bordered w-full"
            value={localTextSearch.value}
            onInput={(e) => {
              localTextSearch.value = (e.target as HTMLInputElement).value;
            }}
          />
        </div>

        {/* 密度フィルタ */}
        {hasDensityData && (
          <div class="mb-6">
            <label class="label">
              <span class="label-text font-semibold">密度フィルタ</span>
            </label>
            <div class="bg-base-200 rounded-lg p-4">
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text">
                    密度ランク上位{" "}
                    {Math.round(localMaxDensity.value * 100)}% を表示
                  </span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={localMaxDensity.value}
                  class="range range-primary range-sm"
                  onInput={(e) => {
                    localMaxDensity.value = parseFloat(
                      (e.target as HTMLInputElement).value,
                    );
                  }}
                />
                <div class="flex justify-between text-xs px-1 mt-1">
                  <span>10%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">
                    最小件数: {localMinValue.value}件以上
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={localMinValue.value}
                  class="range range-secondary range-sm"
                  onInput={(e) => {
                    localMinValue.value = parseInt(
                      (e.target as HTMLInputElement).value,
                      10,
                    );
                  }}
                />
                <div class="flex justify-between text-xs px-1 mt-1">
                  <span>1</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* カテゴリ属性フィルタ */}
        {attributeMetas.value.filter((attr) =>
              attr.type === "categorical" && attr.values.length <= 20
            ).length > 0 && (
          <div class="mb-6">
            <label class="label">
              <span class="label-text font-semibold">カテゴリ属性フィルタ</span>
            </label>
            <div class="space-y-4">
              {attributeMetas.value
                .filter((attr) =>
                  attr.type === "categorical" && attr.values.length <= 20
                )
                .map((attr) => (
                  <div key={attr.name} class="bg-base-200 rounded-lg p-4">
                    <div class="font-medium mb-2">{attr.name}</div>
                    <div class="flex flex-wrap gap-2">
                      {attr.values.map((value) => {
                        const isChecked =
                          (localAttributeFilters.value[attr.name] || [])
                            .includes(value);
                        return (
                          <label
                            key={value}
                            class={`cursor-pointer px-3 py-1 rounded-full text-sm border transition-colors ${
                              isChecked
                                ? "bg-primary text-primary-content border-primary"
                                : "bg-base-100 border-base-300 hover:border-primary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              class="hidden"
                              checked={isChecked}
                              onChange={() =>
                                toggleAttributeValue(attr.name, value)}
                            />
                            {value} ({attr.valueCounts[value]})
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 数値範囲フィルタ */}
        {attributeMetas.value.filter((attr) =>
              attr.type === "numeric" && attr.numericRange
            ).length > 0 && (
          <div class="mb-6">
            <label class="label">
              <span class="label-text font-semibold">数値範囲フィルタ</span>
            </label>
            <div class="space-y-4">
              {attributeMetas.value
                .filter((attr) => attr.type === "numeric" && attr.numericRange)
                .map((attr) => {
                  const range = attr.numericRange!;
                  const isEnabled = localEnabledRanges.value[attr.name] ??
                    false;
                  const currentRange = localNumericRanges.value[attr.name] ??
                    range;
                  const includeEmpty =
                    localIncludeEmptyValues.value[attr.name] ?? true;

                  return (
                    <div key={attr.name} class="bg-base-200 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-3">
                        <div class="font-medium">{attr.name}</div>
                        <label class="flex items-center gap-2 cursor-pointer">
                          <span class="text-sm">フィルタを有効化</span>
                          <input
                            type="checkbox"
                            class="toggle toggle-primary toggle-sm"
                            checked={isEnabled}
                            onChange={(e) => {
                              const checked =
                                (e.target as HTMLInputElement).checked;
                              localEnabledRanges.value = {
                                ...localEnabledRanges.value,
                                [attr.name]: checked,
                              };
                              // 初回有効化時にデフォルト範囲を設定
                              if (
                                checked && !localNumericRanges.value[attr.name]
                              ) {
                                localNumericRanges.value = {
                                  ...localNumericRanges.value,
                                  [attr.name]: range,
                                };
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div
                        class={`space-y-3 ${
                          isEnabled ? "" : "opacity-50 pointer-events-none"
                        }`}
                      >
                        <div class="text-sm text-base-content/70">
                          データ範囲: {range[0]} 〜 {range[1]}
                        </div>
                        <div class="flex items-center gap-3">
                          <div class="form-control flex-1">
                            <label class="label py-1">
                              <span class="label-text text-xs">最小値</span>
                            </label>
                            <input
                              type="number"
                              class="input input-bordered input-sm w-full"
                              value={currentRange[0]}
                              min={range[0]}
                              max={range[1]}
                              step="any"
                              onInput={(e) => {
                                const val = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                );
                                if (!isNaN(val)) {
                                  localNumericRanges.value = {
                                    ...localNumericRanges.value,
                                    [attr.name]: [val, currentRange[1]],
                                  };
                                }
                              }}
                            />
                          </div>
                          <span class="mt-6">〜</span>
                          <div class="form-control flex-1">
                            <label class="label py-1">
                              <span class="label-text text-xs">最大値</span>
                            </label>
                            <input
                              type="number"
                              class="input input-bordered input-sm w-full"
                              value={currentRange[1]}
                              min={range[0]}
                              max={range[1]}
                              step="any"
                              onInput={(e) => {
                                const val = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                );
                                if (!isNaN(val)) {
                                  localNumericRanges.value = {
                                    ...localNumericRanges.value,
                                    [attr.name]: [currentRange[0], val],
                                  };
                                }
                              }}
                            />
                          </div>
                        </div>

                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            checked={includeEmpty}
                            onChange={(e) => {
                              localIncludeEmptyValues.value = {
                                ...localIncludeEmptyValues.value,
                                [attr.name]:
                                  (e.target as HTMLInputElement).checked,
                              };
                            }}
                          />
                          <span class="text-sm">空の値を含める</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {!hasDensityData && attributeMetas.value.length === 0 && (
          <div class="alert alert-info mb-6">
            <span>
              このデータには密度情報や属性データがありません。テキスト検索のみ利用可能です。
            </span>
          </div>
        )}

        <div class="modal-action">
          <button type="button" class="btn btn-ghost" onClick={handleReset}>
            リセット
          </button>
          <button type="button" class="btn btn-ghost" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" class="btn btn-primary" onClick={handleApply}>
            適用
          </button>
        </div>
      </div>
      <div class="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// フィルタリング結果を計算するヘルパー関数
export function applyFilters(
  args: Argument[],
  clusters: Cluster[],
  filterState: FilterState,
  options: { applyDensityFilter?: boolean } = {},
): {
  filteredArgumentIds: Set<string>;
  filteredClusterIds: Set<string>;
  isFiltering: boolean;
} {
  const { applyDensityFilter = false } = options;
  const {
    textSearch,
    maxDensity,
    minValue,
    attributeFilters,
    numericRanges,
    enabledRanges,
    includeEmptyValues,
  } = filterState;

  const effectiveMaxDensity = applyDensityFilter ? maxDensity : 1;
  const effectiveMinValue = applyDensityFilter ? minValue : 0;

  // 有効な数値範囲フィルタがあるか確認
  const hasActiveNumericRanges = Object.keys(enabledRanges).some((k) =>
    enabledRanges[k] === true
  );

  const isFiltering = textSearch.trim() !== "" ||
    (applyDensityFilter && (maxDensity < 1 || minValue > 0)) ||
    Object.keys(attributeFilters).some((k) => attributeFilters[k].length > 0) ||
    hasActiveNumericRanges;

  if (!isFiltering) {
    return {
      filteredArgumentIds: new Set(args.map((a) => a.arg_id)),
      filteredClusterIds: new Set(clusters.map((c) => c.id)),
      isFiltering: false,
    };
  }

  // 引数のフィルタリング
  const filteredArgs = args.filter((arg) => {
    // テキスト検索
    if (textSearch.trim() !== "") {
      const searchLower = textSearch.trim().toLowerCase();
      if (!arg.argument.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // カテゴリ属性フィルタ
    for (const [attrName, selectedValues] of Object.entries(attributeFilters)) {
      if (selectedValues.length === 0) continue;
      const attrValue = arg.attributes?.[attrName];
      if (!selectedValues.includes(String(attrValue ?? ""))) {
        return false;
      }
    }

    // 数値範囲フィルタ
    for (const [attrName, isEnabled] of Object.entries(enabledRanges)) {
      if (!isEnabled) continue;
      const range = numericRanges[attrName];
      if (!range) continue;

      const attrValue = arg.attributes?.[attrName];
      const includeEmpty = includeEmptyValues[attrName] ?? true;

      // 値が空の場合
      if (attrValue == null || attrValue === "") {
        if (!includeEmpty) {
          return false;
        }
        // 空の値を含める場合はこのフィルタをパス
        continue;
      }

      const numValue = Number(attrValue);
      if (Number.isNaN(numValue)) {
        // 数値に変換できない場合は空と同じ扱い
        if (!includeEmpty) {
          return false;
        }
        continue;
      }

      // 範囲チェック
      if (numValue < range[0] || numValue > range[1]) {
        return false;
      }
    }

    return true;
  });

  // 密度フィルタ（クラスタ）
  const deepestLevel = clusters.reduce((max, c) => Math.max(max, c.level), 0);
  const densityFilteredClusterIds = new Set(
    clusters
      .filter((c) => {
        if (c.level !== deepestLevel) return true;
        const density = c.density_rank_percentile ?? 0;
        return density <= effectiveMaxDensity && c.value >= effectiveMinValue;
      })
      .map((c) => c.id),
  );

  const finalFilteredArgs = filteredArgs.filter((arg) => {
    // 密度フィルタが無効な場合はすべて通過
    if (effectiveMaxDensity >= 1 && effectiveMinValue <= 0) return true;

    // 引数が属する最深レベルのクラスタIDを取得
    const argDeepestClusterIds = arg.cluster_ids.filter((cid) =>
      clusters.some((c) => c.id === cid && c.level === deepestLevel)
    );

    // 最深レベルのクラスタがない場合は通過
    if (argDeepestClusterIds.length === 0) return true;

    // 少なくとも1つの最深クラスタが密度フィルタを通過していれば表示
    return argDeepestClusterIds.some((cid) =>
      densityFilteredClusterIds.has(cid)
    );
  });

  const filteredArgumentIds = new Set(finalFilteredArgs.map((a) => a.arg_id));

  return {
    filteredArgumentIds,
    filteredClusterIds: densityFilteredClusterIds,
    isFiltering,
  };
}
