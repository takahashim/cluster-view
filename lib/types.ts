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

// Filter state for FilterPanel
export interface FilterState {
  textSearch: string;
  maxDensity: number;
  minValue: number;
  attributeFilters: Record<string, string[]>;
  numericRanges: Record<string, [number, number]>;
  enabledRanges: Record<string, boolean>;
  includeEmptyValues: Record<string, boolean>;
}

// Domain entity

export interface Report {
  id: string;
  title: string;
  data?: HierarchicalResult; // Optional for list views
  shareToken: string;
  createdAt: string;
}

// Persistence records

export interface ReportRecord {
  id: string;
  shareToken: string;
  ownerId: string;
  data?: HierarchicalResult; // For MemoryStore
  dataChunks?: number; // Number of chunks for KV storage
  createdAt: string;
  title?: string;
  shareEnabled: boolean;
  commentCount?: number; // Stored as metadata for admin view
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  lastLoginAt: string;
}
