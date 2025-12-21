import { useEffect, useRef } from "preact/hooks";
import type { Argument, Cluster } from "@/lib/types.ts";
import { getClusterColor, INACTIVE_COLOR } from "@/lib/colors.ts";
import { CHART_HEIGHT_CLASS, CHART_HEIGHT_FULL } from "@/lib/constants.ts";
import type {
  PlotlyScatterData,
  PlotlyScatterLayout,
  PlotlyAnnotation,
  PlotlyConfig,
} from "@/lib/plotly-types.ts";

// Declare Plotly type on globalThis
declare const Plotly: {
  newPlot: (
    element: HTMLElement,
    data: PlotlyScatterData[],
    layout: PlotlyScatterLayout,
    config?: PlotlyConfig,
  ) => Promise<void>;
  react: (
    element: HTMLElement,
    data: PlotlyScatterData[],
    layout: PlotlyScatterLayout,
  ) => Promise<void>;
} | undefined;

interface ScatterPlotProps {
  arguments: Argument[];
  clusters: Cluster[];
  selectedClusterId: string | null;
  targetLevel?: number; // 1 = 全体表示, 最大レベル = 密度表示
  fullHeight?: boolean; // フルスクリーン用
  filteredArgumentIds?: Set<string>; // フィルタで選択された引数ID
  filteredClusterIds?: Set<string>; // 密度フィルタで選択されたクラスタID
}

export default function ScatterPlot({
  arguments: args,
  clusters,
  selectedClusterId,
  targetLevel = 1,
  fullHeight = false,
  filteredArgumentIds,
  filteredClusterIds,
}: ScatterPlotProps) {
  // 最大レベルを計算（密度表示用）
  const maxLevel = Math.max(...clusters.map((c) => c.level));
  const plotRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Get cluster ID at specific level from an argument's cluster_ids
  const getClusterIdAtLevel = (
    clusterIds: string[],
    level: number,
  ): string | undefined => {
    return clusterIds.find((id) => id.startsWith(`${level}_`));
  };

  // Get level 1 cluster ID from an argument's cluster_ids (backwards compatibility)
  const getLevel1ClusterId = (clusterIds: string[]): string | undefined => {
    return getClusterIdAtLevel(clusterIds, 1);
  };

  // Calculate centroid for a set of points
  const calculateCentroid = (
    points: Argument[],
  ): { x: number; y: number } | null => {
    if (points.length === 0) return null;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  };

  // Build annotations for clusters
  const buildAnnotations = (
    targetClusters: Cluster[],
    clusterPoints: Map<string, Argument[]>,
  ): PlotlyAnnotation[] => {
    return targetClusters
      .filter((cluster) => {
        const points = clusterPoints.get(cluster.id);
        return points && points.length > 0;
      })
      .map((cluster) => {
        const points = clusterPoints.get(cluster.id)!;
        const centroid = calculateCentroid(points)!;
        const label = cluster.label.length > 16
          ? cluster.label.slice(0, 16) + "..."
          : cluster.label;

        return {
          x: centroid.x,
          y: centroid.y,
          text: label,
          showarrow: false,
          font: {
            size: 11,
            color: "#1e293b",
          },
          bgcolor: "rgba(255, 255, 255, 0.9)",
          borderpad: 4,
          opacity: 0.9,
        };
      });
  };

  // Get colors for points based on selection, targetLevel, and filters
  const getPointColors = (): string[] => {
    if (!selectedClusterId) {
      // Color by target level cluster
      return args.map((arg) => {
        // 引数フィルタが適用されている場合、フィルタに含まれない引数はグレー表示
        if (filteredArgumentIds && !filteredArgumentIds.has(arg.arg_id)) {
          return INACTIVE_COLOR;
        }

        const clusterId = getClusterIdAtLevel(arg.cluster_ids, targetLevel);

        // 密度フィルタが適用されている場合、フィルタに含まれないクラスタはグレー表示
        if (filteredClusterIds && clusterId) {
          // 最深レベルのクラスタIDを取得して、フィルタに含まれているか確認
          const deepestClusterId = getClusterIdAtLevel(arg.cluster_ids, maxLevel);
          if (deepestClusterId && !filteredClusterIds.has(deepestClusterId)) {
            return INACTIVE_COLOR;
          }
        }

        return clusterId ? getClusterColor(clusterId) : getClusterColor("1_0");
      });
    } else {
      // Subcluster view: highlight selected cluster's children
      const childClusters = clusters.filter(
        (c) => c.parent === selectedClusterId,
      );
      const childIds = new Set(childClusters.map((c) => c.id));

      return args.map((arg) => {
        // 引数フィルタが適用されている場合、フィルタに含まれない引数はグレー表示
        if (filteredArgumentIds && !filteredArgumentIds.has(arg.arg_id)) {
          return INACTIVE_COLOR;
        }

        // Check if this point belongs to one of the child clusters
        const belongsToChild = arg.cluster_ids.some((id) => childIds.has(id));
        if (belongsToChild) {
          // Find which child cluster it belongs to
          const childId = arg.cluster_ids.find((id) => childIds.has(id));
          return childId ? getClusterColor(childId) : INACTIVE_COLOR;
        }
        return INACTIVE_COLOR;
      });
    }
  };

  // Group points by cluster ID
  const groupPointsByCluster = (
    clusterLevel: number,
  ): Map<string, Argument[]> => {
    const groups = new Map<string, Argument[]>();

    args.forEach((arg) => {
      const clusterId = arg.cluster_ids.find((id) => {
        const level = parseInt(id.split("_")[0], 10);
        return level === clusterLevel;
      });

      if (clusterId) {
        const existing = groups.get(clusterId) || [];
        existing.push(arg);
        groups.set(clusterId, existing);
      }
    });

    return groups;
  };

  // Build plot data
  const buildPlotData = (): PlotlyScatterData[] => {
    const colors = getPointColors();

    return [
      {
        x: args.map((a) => a.x),
        y: args.map((a) => a.y),
        mode: "markers",
        type: "scattergl",
        text: args.map((a) => a.argument),
        marker: {
          size: 8,
          opacity: 0.7,
          color: colors,
        },
        hovertemplate: "%{text}<extra></extra>",
      },
    ];
  };

  // Build layout
  const buildLayout = (): PlotlyScatterLayout => {
    let annotations: PlotlyAnnotation[] = [];

    if (!selectedClusterId) {
      // Show annotations for target level clusters
      const targetClusters = clusters.filter((c) => c.level === targetLevel);
      const clusterPoints = groupPointsByCluster(targetLevel);
      annotations = buildAnnotations(targetClusters, clusterPoints);
    } else {
      // Subcluster view: show child cluster annotations
      const childClusters = clusters.filter(
        (c) => c.parent === selectedClusterId,
      );
      const childLevel = childClusters[0]?.level || 2;
      const clusterPoints = groupPointsByCluster(childLevel);
      annotations = buildAnnotations(childClusters, clusterPoints);
    }

    return {
      showlegend: false,
      hovermode: "closest",
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
      },
      annotations,
      margin: { l: 20, r: 20, t: 20, b: 20 },
      autosize: true,
    };
  };

  // Initialize plot
  useEffect(() => {
    if (!plotRef.current || !Plotly) return;

    const config: PlotlyConfig = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: [
        "select2d",
        "lasso2d",
        "resetScale2d",
        "toImage",
      ],
      displaylogo: false,
    };

    if (!initializedRef.current) {
      Plotly.newPlot(
        plotRef.current,
        buildPlotData(),
        buildLayout(),
        config,
      );
      initializedRef.current = true;
    } else {
      Plotly.react(plotRef.current, buildPlotData(), buildLayout());
    }
  }, [selectedClusterId, args, clusters, targetLevel, filteredArgumentIds, filteredClusterIds]);

  const heightClass = fullHeight ? CHART_HEIGHT_FULL : CHART_HEIGHT_CLASS;

  return (
    <div class={`w-full ${fullHeight ? "h-full" : ""}`}>
      <div ref={plotRef} class={`w-full ${heightClass}`} />
      {!fullHeight && (
        <p class="text-sm text-base-content/60 text-center mt-2">
          各点にカーソルを合わせると意見を確認できます
        </p>
      )}
    </div>
  );
}
