import { useEffect, useRef } from "preact/hooks";
import type { Argument, Cluster } from "@/lib/types.ts";
import { getClusterColor, INACTIVE_COLOR } from "@/lib/colors.ts";

// Declare Plotly type
declare global {
  interface Window {
    Plotly: {
      newPlot: (
        element: HTMLElement,
        data: PlotlyData[],
        layout: PlotlyLayout,
        config?: PlotlyConfig
      ) => Promise<void>;
      react: (
        element: HTMLElement,
        data: PlotlyData[],
        layout: PlotlyLayout
      ) => Promise<void>;
    };
  }
}

interface PlotlyData {
  x: number[];
  y: number[];
  mode: string;
  type: string;
  text: string[];
  marker: {
    size: number;
    opacity: number;
    color: string[];
  };
  hovertemplate: string;
}

interface PlotlyLayout {
  showlegend: boolean;
  hovermode: string;
  xaxis: {
    showgrid: boolean;
    zeroline: boolean;
    showticklabels: boolean;
  };
  yaxis: {
    showgrid: boolean;
    zeroline: boolean;
    showticklabels: boolean;
  };
  annotations: PlotlyAnnotation[];
  margin: {
    l: number;
    r: number;
    t: number;
    b: number;
  };
  autosize: boolean;
}

interface PlotlyAnnotation {
  x: number;
  y: number;
  text: string;
  showarrow: boolean;
  font: {
    size: number;
    color: string;
  };
  bgcolor: string;
  borderpad: number;
  opacity: number;
}

interface PlotlyConfig {
  responsive: boolean;
  displayModeBar: boolean;
  modeBarButtonsToRemove: string[];
  displaylogo: boolean;
}

interface ScatterPlotProps {
  arguments: Argument[];
  clusters: Cluster[];
  selectedClusterId: string | null;
}

export default function ScatterPlot({
  arguments: args,
  clusters,
  selectedClusterId,
}: ScatterPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Get level 1 cluster ID from an argument's cluster_ids
  const getLevel1ClusterId = (clusterIds: string[]): string | undefined => {
    return clusterIds.find((id) => id.startsWith("1_"));
  };

  // Calculate centroid for a set of points
  const calculateCentroid = (
    points: Argument[]
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
    clusterPoints: Map<string, Argument[]>
  ): PlotlyAnnotation[] => {
    return targetClusters
      .filter((cluster) => {
        const points = clusterPoints.get(cluster.id);
        return points && points.length > 0;
      })
      .map((cluster) => {
        const points = clusterPoints.get(cluster.id)!;
        const centroid = calculateCentroid(points)!;
        const label =
          cluster.label.length > 16
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

  // Get colors for points based on selection
  const getPointColors = (): string[] => {
    if (!selectedClusterId) {
      // Main view: color by level 1 cluster
      return args.map((arg) => {
        const level1Id = getLevel1ClusterId(arg.cluster_ids);
        return level1Id ? getClusterColor(level1Id) : getClusterColor("1_0");
      });
    } else {
      // Subcluster view: highlight selected cluster's children
      const childClusters = clusters.filter(
        (c) => c.parent === selectedClusterId
      );
      const childIds = new Set(childClusters.map((c) => c.id));

      return args.map((arg) => {
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
    clusterLevel: number
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
  const buildPlotData = (): PlotlyData[] => {
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
  const buildLayout = (): PlotlyLayout => {
    let annotations: PlotlyAnnotation[] = [];

    if (!selectedClusterId) {
      // Main view: show level 1 cluster annotations
      const level1Clusters = clusters.filter((c) => c.level === 1);
      const clusterPoints = groupPointsByCluster(1);
      annotations = buildAnnotations(level1Clusters, clusterPoints);
    } else {
      // Subcluster view: show child cluster annotations
      const childClusters = clusters.filter(
        (c) => c.parent === selectedClusterId
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
    if (!plotRef.current || !window.Plotly) return;

    const config: PlotlyConfig = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "resetScale2d", "toImage"],
      displaylogo: false,
    };

    if (!initializedRef.current) {
      window.Plotly.newPlot(
        plotRef.current,
        buildPlotData(),
        buildLayout(),
        config
      );
      initializedRef.current = true;
    } else {
      window.Plotly.react(plotRef.current, buildPlotData(), buildLayout());
    }
  }, [selectedClusterId, args, clusters]);

  return (
    <div class="w-full">
      <div ref={plotRef} class="w-full h-[350px] md:h-[500px]" />
      <p class="text-sm text-base-content/60 text-center mt-2">
        各点にカーソルを合わせると意見を確認できます
      </p>
    </div>
  );
}
