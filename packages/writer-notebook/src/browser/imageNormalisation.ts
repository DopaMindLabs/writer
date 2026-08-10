import { DEFAULT_NOTEBOOK_LIMITS } from '../core/limits';
import { drawBitmap, fitDimensions } from './imageCanvas';
import {
  SUPPORTED_PAGE_IMAGE_MIME_TYPES,
  type PageImageLimits,
  type PageImageProcessingOptions,
  type ProcessedRasterImage,
} from './image.types';

const SOURCE_MIME = 'image/webp';
const SOURCE_QUALITY = 0.9;

export const resolveImageLimits = (
  overrides?: Partial<PageImageLimits>,
): PageImageLimits => ({
  maxSourceBytes: overrides?.maxSourceBytes ?? DEFAULT_NOTEBOOK_LIMITS.maxSourceBytes,
  maxThumbnailBytes: overrides?.maxThumbnailBytes ?? DEFAULT_NOTEBOOK_LIMITS.maxThumbnailBytes,
  maxDecodedPixels: overrides?.maxDecodedPixels ?? DEFAULT_NOTEBOOK_LIMITS.maxDecodedPixels,
  maxImageDimension: overrides?.maxImageDimension ?? DEFAULT_NOTEBOOK_LIMITS.maxImageDimension,
});

const assertInput = (input: Blob, limits: PageImageLimits): void => {
  if (!SUPPORTED_PAGE_IMAGE_MIME_TYPES.some((mime) => mime === input.type)) {
    throw new TypeError('Notebook page image type is not supported');
  }
  if (input.size <= 0 || input.size > limits.maxSourceBytes) {
    throw new RangeError('Notebook page source exceeds the byte limit');
  }
};

export const normalisePageImage = async (
  input: Blob,
  options: PageImageProcessingOptions = {},
): Promise<ProcessedRasterImage> => {
  const limits = resolveImageLimits(options.limits);
  assertInput(input, limits);
  const bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
  try {
    const dimensions = fitDimensions(bitmap, limits.maxImageDimension, limits.maxDecodedPixels);
    const result = await drawBitmap(bitmap, dimensions, SOURCE_MIME, SOURCE_QUALITY);
    if (result.blob.size > limits.maxSourceBytes) {
      throw new RangeError('Normalised notebook page exceeds the byte limit');
    }
    return result;
  } finally {
    bitmap.close();
  }
};
