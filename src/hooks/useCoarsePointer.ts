import { useMediaQuery } from './useMediaQuery';

/**
 * True when the primary pointer is coarse (a finger, not a mouse). Used to hide
 * keyboard-shortcut hints on touch devices, where there is no key to press.
 */
export const useCoarsePointer = (): boolean =>
  useMediaQuery('(pointer: coarse)');
