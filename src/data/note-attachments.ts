
export const MAX_NOTE_IMAGES = 2;

export const ACCEPTED_IMAGE_MIME: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME.join(',');

export const isAcceptedImageType = (mime: string): boolean =>
  ACCEPTED_IMAGE_MIME.includes(mime);
