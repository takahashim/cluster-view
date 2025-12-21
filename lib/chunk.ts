/**
 * Chunk utilities for splitting and joining large data
 * These are pure functions for easy testing
 */

export const DEFAULT_CHUNK_SIZE = 30_000; // 30KB per chunk

/**
 * Split a string into chunks of specified size
 */
export function splitIntoChunks(
  str: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): string[] {
  if (str.length === 0) {
    return [""];
  }

  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Join chunks back into a single string
 */
export function joinChunks(chunks: string[]): string {
  return chunks.join("");
}
