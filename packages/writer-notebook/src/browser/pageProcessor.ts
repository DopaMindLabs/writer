import { normalisePageImage } from './imageNormalisation';
import type { PageImageProcessingOptions, ProcessedPageImage } from './image.types';
import { createPageThumbnail } from './thumbnail';

export const processPageImage = async (
  input: Blob,
  options: PageImageProcessingOptions = {},
): Promise<ProcessedPageImage> => {
  const source = await normalisePageImage(input, options);
  const thumbnail = await createPageThumbnail(source, options);
  return { source, thumbnail };
};
