import type { Argument, Cluster, HierarchicalResult } from "./types.ts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Validate that the data has the required structure
export function validateHierarchicalResult(data: unknown): HierarchicalResult {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Invalid data: expected an object");
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (!Array.isArray(obj.arguments)) {
    throw new ValidationError("Missing or invalid 'arguments' array");
  }

  if (!Array.isArray(obj.clusters)) {
    throw new ValidationError("Missing or invalid 'clusters' array");
  }

  if (!obj.comments || typeof obj.comments !== "object") {
    throw new ValidationError("Missing or invalid 'comments' object");
  }

  if (typeof obj.overview !== "string") {
    throw new ValidationError("Missing or invalid 'overview' string");
  }

  if (!obj.config || typeof obj.config !== "object") {
    throw new ValidationError("Missing or invalid 'config' object");
  }

  // Validate arguments structure
  for (let i = 0; i < obj.arguments.length; i++) {
    const arg = obj.arguments[i] as Record<string, unknown>;
    if (!validateArgument(arg)) {
      throw new ValidationError(`Invalid argument at index ${i}`);
    }
  }

  // Validate clusters structure
  for (let i = 0; i < obj.clusters.length; i++) {
    const cluster = obj.clusters[i] as Record<string, unknown>;
    if (!validateCluster(cluster)) {
      throw new ValidationError(`Invalid cluster at index ${i}`);
    }
  }

  return {
    arguments: obj.arguments as Argument[],
    clusters: obj.clusters as Cluster[],
    comments: obj.comments as Record<string, { comment: string }>,
    propertyMap: (obj.propertyMap || {}) as Record<
      string,
      Record<string, unknown>
    >,
    translations: (obj.translations || {}) as Record<string, unknown>,
    overview: obj.overview as string,
    config: obj.config as Record<string, unknown>,
    comment_num: typeof obj.comment_num === "number"
      ? obj.comment_num
      : undefined,
  };
}

function validateArgument(arg: Record<string, unknown>): boolean {
  return (
    typeof arg.arg_id === "string" &&
    typeof arg.argument === "string" &&
    (typeof arg.comment_id === "number" ||
      typeof arg.comment_id === "string") &&
    typeof arg.x === "number" &&
    typeof arg.y === "number" &&
    Array.isArray(arg.cluster_ids)
  );
}

function validateCluster(cluster: Record<string, unknown>): boolean {
  return (
    typeof cluster.level === "number" &&
    typeof cluster.id === "string" &&
    typeof cluster.label === "string" &&
    typeof cluster.takeaway === "string" &&
    typeof cluster.value === "number" &&
    typeof cluster.parent === "string"
  );
}
