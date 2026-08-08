export interface SafeVectorLimits {
  readonly maxDimension: number;
  readonly maxPaths: number;
  readonly maxBytes: number;
  readonly maxPathBytes: number;
  readonly maxCommandsPerPath: number;
}

export interface NotebookLimits {
  readonly maxTitleLength: number;
  readonly maxPagesPerNotebook: number;
  readonly maxSourceBytes: number;
  readonly maxThumbnailBytes: number;
  readonly maxVectorBytes: number;
  readonly maxAggregateAssetBytes: number;
  readonly maxDecodedPixels: number;
  readonly maxImageDimension: number;
  readonly safeVector: SafeVectorLimits;
}

export const DEFAULT_SAFE_VECTOR_LIMITS: SafeVectorLimits = Object.freeze({
  maxDimension: 4096,
  maxPaths: 50_000,
  maxBytes: 8 * 1024 * 1024,
  maxPathBytes: 512 * 1024,
  maxCommandsPerPath: 100_000,
});

export const DEFAULT_NOTEBOOK_LIMITS: NotebookLimits = Object.freeze({
  maxTitleLength: 200,
  maxPagesPerNotebook: 100,
  maxSourceBytes: 20 * 1024 * 1024,
  maxThumbnailBytes: 2 * 1024 * 1024,
  maxVectorBytes: 8 * 1024 * 1024,
  maxAggregateAssetBytes: 256 * 1024 * 1024,
  maxDecodedPixels: 20_000_000,
  maxImageDimension: 4096,
  safeVector: DEFAULT_SAFE_VECTOR_LIMITS,
});
