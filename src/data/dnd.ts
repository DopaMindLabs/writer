/**
 * The custom drag type carrying a library media id, so a row dragged from the
 * library onto the brain-space canvas can be told apart from a file drag. Same
 * app only — the payload is a media id, never bytes.
 */
export const MEDIA_DND_TYPE = 'application/x-lipsum-media-id';
