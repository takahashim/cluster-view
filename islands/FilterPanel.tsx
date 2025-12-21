import { useSignal, useComputed } from "@preact/signals";
import type { Argument, Cluster } from "@/lib/types.ts";

// 属性のメタデータ
interface AttributeMeta {
  name: string;
  type: "numeric" | "categorical";
  values: string[];
  valueCounts: Record<string, number>;
  numericRange?: [number, number];
}

// フィルタ状態
export interface FilterState {
  textSearch: string;
  maxDensity: number;
  minValue: number;
  attributeFilters: Record<string, string[]>;
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
        attrMap[name].valueCounts.set(value, (attrMap[name].valueCounts.get(value) ?? 0) + 1);
        if (value.trim() !== "") {
          const num = Number(value);
          if (Number.isNaN(num)) {
            attrMap[name].isNumeric = false;
          } else if (attrMap[name].isNumeric) {
            if (attrMap[name].min === undefined || num < attrMap[name].min) attrMap[name].min = num;
            if (attrMap[name].max === undefined || num > attrMap[name].max) attrMap[name].max = num;
          }
        }
      }
    }

    return Object.entries(attrMap).map(([name, info]) => {
      const values = Array.from(info.valueSet).filter((v) => v !== "").sort();
      const valueCounts: Record<string, number> = {};
      for (const v of values) valueCounts[v] = info.valueCounts.get(v) ?? 0;
      let numericRange: [number, number] | undefined = undefined;
      if (info.isNumeric && values.length > 0 && info.min !== undefined && info.max !== undefined) {
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
  const hasDensityData = clusters.some((c) => c.density_rank_percentile !== undefined);

  // ローカル状態（編集中）
  const localTextSearch = useSignal(filterState.textSearch);
  const localMaxDensity = useSignal(filterState.maxDensity);
  const localMinValue = useSignal(filterState.minValue);
  const localAttributeFilters = useSignal<Record<string, string[]>>({ ...filterState.attributeFilters });

  const handleApply = () => {
    onFilterChange({
      textSearch: localTextSearch.value,
      maxDensity: localMaxDensity.value,
      minValue: localMinValue.value,
      attributeFilters: localAttributeFilters.value,
    });
    onClose();
  };

  const handleReset = () => {
    localTextSearch.value = "";
    localMaxDensity.value = 1;
    localMinValue.value = 1;
    localAttributeFilters.value = {};
    onFilterChange({
      textSearch: "",
      maxDensity: 1,
      minValue: 1,
      attributeFilters: {},
    });
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
                    密度ランク上位 {Math.round(localMaxDensity.value * 100)}% を表示
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
                    localMaxDensity.value = parseFloat((e.target as HTMLInputElement).value);
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
                  <span class="label-text">最小件数: {localMinValue.value}件以上</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={localMinValue.value}
                  class="range range-secondary range-sm"
                  onInput={(e) => {
                    localMinValue.value = parseInt((e.target as HTMLInputElement).value, 10);
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

        {/* 属性フィルタ */}
        {attributeMetas.value.length > 0 && (
          <div class="mb-6">
            <label class="label">
              <span class="label-text font-semibold">属性フィルタ</span>
            </label>
            <div class="space-y-4">
              {attributeMetas.value
                .filter((attr) => attr.type === "categorical" && attr.values.length <= 20)
                .map((attr) => (
                  <div key={attr.name} class="bg-base-200 rounded-lg p-4">
                    <div class="font-medium mb-2">{attr.name}</div>
                    <div class="flex flex-wrap gap-2">
                      {attr.values.map((value) => {
                        const isChecked = (localAttributeFilters.value[attr.name] || []).includes(value);
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
                              onChange={() => toggleAttributeValue(attr.name, value)}
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

        {!hasDensityData && attributeMetas.value.length === 0 && (
          <div class="alert alert-info mb-6">
            <span>このデータには密度情報や属性データがありません。テキスト検索のみ利用可能です。</span>
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
): {
  filteredArgumentIds: Set<string>;
  filteredClusterIds: Set<string>;
  isFiltering: boolean;
} {
  const { textSearch, maxDensity, minValue, attributeFilters } = filterState;

  // フィルタが適用されているか
  const isFiltering =
    textSearch.trim() !== "" ||
    maxDensity < 1 ||
    minValue > 1 ||
    Object.keys(attributeFilters).some((k) => attributeFilters[k].length > 0);

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

    // 属性フィルタ
    for (const [attrName, selectedValues] of Object.entries(attributeFilters)) {
      if (selectedValues.length === 0) continue;
      const attrValue = arg.attributes?.[attrName];
      if (!selectedValues.includes(String(attrValue ?? ""))) {
        return false;
      }
    }

    return true;
  });

  const filteredArgumentIds = new Set(filteredArgs.map((a) => a.arg_id));

  // 密度フィルタ（クラスタ）
  const deepestLevel = clusters.reduce((max, c) => Math.max(max, c.level), 0);
  const filteredClusterIds = new Set(
    clusters
      .filter((c) => {
        if (c.level !== deepestLevel) return true;
        const density = c.density_rank_percentile ?? 0;
        return density <= maxDensity && c.value >= minValue;
      })
      .map((c) => c.id)
  );

  return {
    filteredArgumentIds,
    filteredClusterIds,
    isFiltering,
  };
}
