import type { NotebookLimits } from '../core/limits';

export const SUPPORTED_PAGE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type SupportedPageImageMime = (typeof SUPPORTED_PAGE_IMAGE_MIME_TYPES)[number];

export type PageImageLimits = Pick<
  NotebookLimits,
  'maxSourceBytes' | 'maxThumbnailBytes' | 'maxDecodedPixels' | 'maxImageDimension'
>;

export interface PageImageProcessingOptions {
  readonly limits?: Partial<PageImageLimits>;
}

export interface ProcessedRasterImage {
  readonly blob: Blob;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
}

export interface ProcessedPageImage {
  readonly source: ProcessedRasterImage;
  readonly thumbnail: ProcessedRasterImage;
}
