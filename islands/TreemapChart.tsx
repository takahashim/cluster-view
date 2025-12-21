import { useEffect, useRef } from "preact/hooks";
import type { Argument, Cluster } from "@/lib/types.ts";
import { CHART_HEIGHT_CLASS, CHART_HEIGHT_FULL } from "@/lib/constants.ts";
import type {
  PlotlyConfig,
  PlotlyHTMLElement,
  PlotlyTreemapData,
  PlotlyTreemapLayout,
} from "@/lib/plotly-types.ts";

// Declare Plotly type on globalThis
declare const Plotly: {
  newPlot: (
    element: HTMLElement,
    data: PlotlyTreemapData[],
    layout: PlotlyTreemapLayout,
    config?: PlotlyConfig,
  ) => Promise<void>;
  react: (
    element: HTMLElement,
    data: PlotlyTreemapData[],
    layout: PlotlyTreemapLayout,
  ) => Promise<void>;
} | undefined;

// Extended node type for treemap with filter flag
interface TreemapNode extends Cluster {
  filtered?: boolean;
}

interface TreemapChartProps {
  arguments: Argument[];
  clusters: Cluster[];
  level: string;
  onTreeZoom: (level: string) => void;
  fullHeight?: boolean;
  filteredArgumentIds?: Set<string>;
  filteredClusterIds?: Set<string>;
}

// Convert argument to treemap node structure
function convertArgumentToNode(argument: Argument): TreemapNode {
  return {
    level: 3,
    id: argument.arg_id,
    label: argument.argument,
    takeaway: "",
    value: 1,
    parent: argument.cluster_ids[2] || argument.cluster_ids[1] ||
      argument.cluster_ids[0],
    density_rank_percentile: 0,
  };
}

export default function TreemapChart({
  arguments: args,
  clusters,
  level,
  onTreeZoom,
  fullHeight = false,
  filteredArgumentIds,
  filteredClusterIds,
}: TreemapChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // 最深レベルを取得
  const maxLevel = Math.max(...clusters.map((c) => c.level));

  // Build treemap data
  const buildTreemapData = (): PlotlyTreemapData[] => {
    const isArgumentFiltering = !!filteredArgumentIds;
    const isClusterFiltering = !!filteredClusterIds;

    // Convert arguments to treemap nodes with filter status
    const argumentNodes: TreemapNode[] = args.map((arg) => {
      const node = convertArgumentToNode(arg);
      // 引数フィルタ
      if (isArgumentFiltering && !filteredArgumentIds.has(arg.arg_id)) {
        return { ...node, filtered: true };
      }
      // 密度フィルタ（最深レベルのクラスタIDで判定）
      if (isClusterFiltering) {
        const deepestClusterId = arg.cluster_ids.find((id) =>
          id.startsWith(`${maxLevel}_`)
        );
        if (deepestClusterId && !filteredClusterIds.has(deepestClusterId)) {
          return { ...node, filtered: true };
        }
      }
      return node;
    });

    // Convert clusters to treemap nodes with filter status
    const clusterNodes: TreemapNode[] = clusters.map((cluster, index) => {
      const node: TreemapNode = index === 0
        ? { ...cluster, parent: "" }
        : { ...cluster };

      // 最深レベルのクラスタに対して密度フィルタを適用
      if (isClusterFiltering && cluster.level === maxLevel) {
        if (!filteredClusterIds.has(cluster.id)) {
          return { ...node, filtered: true };
        }
      }
      return node;
    });

    // Combine all nodes
    const list: TreemapNode[] = [...clusterNodes, ...argumentNodes];

    const ids = list.map((node) => node.id);
    const labels = list.map((node) => {
      return node.id === level
        ? node.label.replace(/(.{50})/g, "$1<br />")
        : node.label.replace(/(.{15})/g, "$1<br />");
    });
    const parents = list.map((node) => node.parent);
    const values = list.map((node) => node.filtered ? 0 : node.value);
    const customdata = list.map((node) => {
      if (node.filtered) return "";
      const takeaway = node.takeaway?.replace(/(.{15})/g, "$1<br />") || "";
      return takeaway;
    });
    const colors = list.map((node) => node.filtered ? "#cccccc" : "");

    const data: PlotlyTreemapData = {
      type: "treemap",
      ids,
      labels,
      parents,
      values,
      customdata,
      level,
      branchvalues: "total",
      marker: {
        colors,
        line: {
          width: 1,
          color: "white",
        },
      },
      hoverinfo: "text",
      hovertemplate: "%{customdata}<extra></extra>",
      hoverlabel: {
        align: "left",
      },
      texttemplate: "%{label}<br>%{value:,}件<br>%{percentEntry:.2%}",
      maxdepth: 2,
      pathbar: {
        thickness: 28,
      },
    };

    return [data];
  };

  const layout: PlotlyTreemapLayout = {
    margin: { l: 10, r: 10, b: 10, t: 30 },
    colorway: [
      "#b3daa1",
      "#f5c5d7",
      "#d5e5f0",
      "#fbecc0",
      "#80b8ca",
      "#dabeed",
      "#fad1af",
      "#fbb09d",
      "#a6e3ae",
      "#f1e4d6",
    ],
  };

  // Handle click to zoom
  const handleClick = (
    event: { points: Array<{ pointNumber: number; data: { ids: string[] } }> },
  ) => {
    const clickedNode = event.points[0];
    const newLevel =
      clickedNode.data.ids[clickedNode.pointNumber]?.toString() || "0";
    onTreeZoom(newLevel);
  };

  // Darken pathbar colors for better visibility
  const darkenPathbar = () => {
    const panels = document.querySelectorAll(".treemap > .slice > .surface");
    const leafColor = getColor(panels[panels.length - 1]);
    if (panels.length > 1) darkenColor(panels[0], leafColor);
    const pathbars = document.querySelectorAll(
      ".treemap > .pathbar > .surface",
    );
    for (const pathbar of pathbars) darkenColor(pathbar, leafColor);
  };

  const getColor = (elem: Element | undefined): string => {
    if (!elem) return "";
    return elem.computedStyleMap?.()?.get("fill")?.toString() || "";
  };

  const darkenColor = (elem: Element, originalColor: string) => {
    if (getColor(elem) !== originalColor) return;
    const darkenedColor = originalColor.replace(
      /rgb\((\d+), (\d+), (\d+)\)/,
      (_match, r, g, b) => `rgb(${dark(r)}, ${dark(g)}, ${dark(b)})`,
    );
    const style = elem.attributes.getNamedItem("style")?.value || "";
    const newStyle = style.replace(originalColor, darkenedColor);
    elem.setAttribute("style", newStyle);
  };

  const dark = (rgb: string): number => {
    return Math.max(0, Number.parseInt(rgb) - 30);
  };

  // Initialize plot
  useEffect(() => {
    if (!plotRef.current || !Plotly) return;

    const config: PlotlyConfig = {
      responsive: true,
      displayModeBar: false,
      locale: "ja",
    };

    const plotElement = plotRef.current;

    if (!initializedRef.current) {
      Plotly.newPlot(plotElement, buildTreemapData(), layout, config).then(
        () => {
          // Add click event listener
          const plotlyElement = plotElement as PlotlyHTMLElement;
          plotlyElement.on("plotly_click", handleClick);
          plotlyElement.on("plotly_hover", darkenPathbar);
          plotlyElement.on("plotly_unhover", darkenPathbar);
          darkenPathbar();
        },
      );
      initializedRef.current = true;
    } else {
      Plotly.react(plotElement, buildTreemapData(), layout).then(() => {
        darkenPathbar();
      });
    }
  }, [level, args, clusters, filteredArgumentIds, filteredClusterIds]);

  const heightClass = fullHeight ? CHART_HEIGHT_FULL : CHART_HEIGHT_CLASS;

  return (
    <div class={`w-full ${fullHeight ? "h-full" : ""}`}>
      <div ref={plotRef} class={`w-full ${heightClass}`} />
      {!fullHeight && (
        <p class="text-sm text-base-content/60 text-center mt-2">
          クラスタをクリックすると詳細を確認できます
        </p>
      )}
    </div>
  );
}
