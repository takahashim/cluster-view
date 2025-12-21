import { useEffect, useRef } from "preact/hooks";
import type { Argument, Cluster } from "@/lib/types.ts";

// Declare Plotly type on globalThis
declare const Plotly: {
  newPlot: (
    element: HTMLElement,
    data: PlotlyTreemapData[],
    layout: PlotlyLayout,
    config?: PlotlyConfig,
  ) => Promise<void>;
  react: (
    element: HTMLElement,
    data: PlotlyTreemapData[],
    layout: PlotlyLayout,
  ) => Promise<void>;
} | undefined;

interface PlotlyTreemapData {
  type: "treemap";
  ids: string[];
  labels: string[];
  parents: string[];
  values: number[];
  customdata: string[];
  level: string;
  branchvalues: "total";
  marker: {
    colors: string[];
    line: {
      width: number;
      color: string;
    };
  };
  hoverinfo: string;
  hovertemplate: string;
  hoverlabel: {
    align: string;
  };
  texttemplate: string;
  maxdepth: number;
  pathbar: {
    thickness: number;
  };
}

interface PlotlyLayout {
  margin: { l: number; r: number; b: number; t: number };
  colorway: string[];
}

interface PlotlyConfig {
  responsive: boolean;
  displayModeBar: boolean;
  locale: string;
}

interface TreemapChartProps {
  arguments: Argument[];
  clusters: Cluster[];
  level: string;
  onTreeZoom: (level: string) => void;
  fullHeight?: boolean;
}

// Convert argument to cluster-like structure for treemap
function convertArgumentToCluster(argument: Argument): Cluster & { filtered?: boolean } {
  return {
    level: 3,
    id: argument.arg_id,
    label: argument.argument,
    takeaway: "",
    value: 1,
    parent: argument.cluster_ids[2] || argument.cluster_ids[1] || argument.cluster_ids[0],
    density_rank_percentile: 0,
  };
}

export default function TreemapChart({
  arguments: args,
  clusters,
  level,
  onTreeZoom,
  fullHeight = false,
}: TreemapChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Build treemap data
  const buildTreemapData = (): PlotlyTreemapData[] => {
    const convertedArgumentList = args.map((arg) => convertArgumentToCluster(arg));

    // Create the node list with root cluster having empty parent
    const list = [
      { ...clusters[0], parent: "" },
      ...clusters.slice(1),
      ...convertedArgumentList,
    ];

    const ids = list.map((node) => node.id);
    const labels = list.map((node) => {
      return node.id === level
        ? node.label.replace(/(.{50})/g, "$1<br />")
        : node.label.replace(/(.{15})/g, "$1<br />");
    });
    const parents = list.map((node) => node.parent);
    const values = list.map((node) => node.value);
    const customdata = list.map((node) => {
      const takeaway = node.takeaway?.replace(/(.{15})/g, "$1<br />") || "";
      return takeaway;
    });
    const colors = list.map(() => ""); // Use default colorway

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

  const layout: PlotlyLayout = {
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
  const handleClick = (event: { points: Array<{ pointNumber: number; data: { ids: string[] } }> }) => {
    const clickedNode = event.points[0];
    const newLevel = clickedNode.data.ids[clickedNode.pointNumber]?.toString() || "0";
    onTreeZoom(newLevel);
  };

  // Darken pathbar colors for better visibility
  const darkenPathbar = () => {
    const panels = document.querySelectorAll(".treemap > .slice > .surface");
    const leafColor = getColor(panels[panels.length - 1]);
    if (panels.length > 1) darkenColor(panels[0], leafColor);
    const pathbars = document.querySelectorAll(".treemap > .pathbar > .surface");
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
      Plotly.newPlot(plotElement, buildTreemapData(), layout, config).then(() => {
        // Add click event listener
        // @ts-ignore - Plotly adds 'on' method to element
        plotElement.on?.("plotly_click", handleClick);
        // @ts-ignore
        plotElement.on?.("plotly_hover", darkenPathbar);
        // @ts-ignore
        plotElement.on?.("plotly_unhover", darkenPathbar);
        darkenPathbar();
      });
      initializedRef.current = true;
    } else {
      Plotly.react(plotElement, buildTreemapData(), layout).then(() => {
        darkenPathbar();
      });
    }
  }, [level, args, clusters]);

  const heightClass = fullHeight ? "h-full" : "h-[350px] md:h-[500px]";

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
