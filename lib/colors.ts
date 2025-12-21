// Color palette for clusters
export const COLORS = [
  "#1f77b4", // blue
  "#ff7f0e", // orange
  "#2ca02c", // green
  "#d62728", // red
  "#9467bd", // purple
  "#8c564b", // brown
  "#e377c2", // pink
  "#7f7f7f", // gray
  "#bcbd22", // olive
  "#17becf", // cyan
];

// Color for inactive/unselected points
export const INACTIVE_COLOR = "rgba(200, 200, 200, 0.2)";

// Get color for a cluster by its ID
export function getClusterColor(clusterId: string | undefined): string {
  if (!clusterId || !clusterId.includes("_")) {
    return COLORS[0];
  }
  const parts = clusterId.split("_");
  const index = parseInt(parts[parts.length - 1] || "0", 10);
  return COLORS[index % COLORS.length];
}

// Get color by index
export function getColorByIndex(index: number): string {
  return COLORS[index % COLORS.length];
}
