// Shared Plotly type definitions

// Plotly global declaration
export declare const Plotly: {
  newPlot: (
    element: HTMLElement,
    data: PlotlyData[],
    layout: PlotlyLayout,
    config?: PlotlyConfig,
  ) => Promise<void>;
  react: (
    element: HTMLElement,
    data: PlotlyData[],
    layout: PlotlyLayout,
  ) => Promise<void>;
} | undefined;

// Common config
export interface PlotlyConfig {
  responsive: boolean;
  displayModeBar: boolean;
  displaylogo?: boolean;
  locale?: string;
  modeBarButtonsToRemove?: string[];
}

// Scatter plot types
export interface PlotlyScatterData {
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

export interface PlotlyAnnotation {
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

export interface PlotlyScatterLayout {
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

// Treemap types
export interface PlotlyTreemapData {
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

export interface PlotlyTreemapLayout {
  margin: { l: number; r: number; b: number; t: number };
  colorway: string[];
}

// Union types for generic usage
export type PlotlyData = PlotlyScatterData | PlotlyTreemapData;
export type PlotlyLayout = PlotlyScatterLayout | PlotlyTreemapLayout;

// Plotly-enhanced HTML element (after newPlot is called)
export interface PlotlyHTMLElement extends HTMLDivElement {
  // deno-lint-ignore no-explicit-any
  on: (event: string, callback: (data: any) => void) => void;
}
