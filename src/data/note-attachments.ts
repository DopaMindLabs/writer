// Configuration for picture attachments on brain-dump notes.

// Maximum number of images a single note may hold. Kept low for now; raising
// this constant is the only change needed to allow more per note.
export const MAX_NOTE_IMAGES = 2;

// Image MIME types accepted by the uploader. Anything else is rejected.
export const ACCEPTED_IMAGE_MIME: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

// Hard cap on a single image's size (5 MB). Larger files are rejected to keep
// IndexedDB and the export ZIP a reasonable size.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// The `accept` attribute for the file input, derived from the accepted types.
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME.join(',');

export const isAcceptedImageType = (mime: string): boolean =>
  ACCEPTED_IMAGE_MIME.includes(mime);
