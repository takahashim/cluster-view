// Value objects (from external JSON schema)

export interface Argument {
  arg_id: string;
  argument: string;
  comment_id?: number | string;
  x: number;
  y: number;
  p?: number;
  cluster_ids: string[];
  attributes?: Record<string, unknown>;
  url?: string;
}

export interface Cluster {
  level: number;
  id: string;
  label: string;
  takeaway: string;
  value: number;
  parent: string;
  density_rank_percentile?: number;
}

export interface Comment {
  comment: string;
}

export interface HierarchicalResult {
  arguments: Argument[];
  clusters: Cluster[];
  comments: Record<string, Comment>;
  propertyMap: Record<string, Record<string, unknown>>;
  translations: Record<string, unknown>;
  overview: string;
  config: Record<string, unknown>;
  comment_num?: number;
}

// Domain entity

export interface Report {
  id: string;
  title: string;
  data: HierarchicalResult;
  shareToken: string;
}

// Persistence record

export interface ReportRecord {
  id: string;
  shareToken: string;
  ownerId: string | null;
  data: HierarchicalResult;
  createdAt: string;
  title?: string;
  shareEnabled: boolean;
}
