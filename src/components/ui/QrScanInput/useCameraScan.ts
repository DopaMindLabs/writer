import { useCallback, useEffect, useRef, useState } from 'react';
import type { QrScanner } from 'writer-qr/scan';

/**
 * The camera half of reading a pairing code: hold the stream, sample frames, and
 * stop the moment a code is found.
 *
 * Kept apart from the markup because it owns a resource with a lifetime — a
 * camera left running after the dialog closes is a recording light the user did
 * not ask for. Every exit path releases it: a successful scan, an explicit stop,
 * unmounting.
 *
 * `getUserMedia` is injected rather than reached for directly, so this runs in a
 * test environment that has no media devices at all.
 */

export type CameraScanState =
  | 'idle'
  /** Permission asked for, not yet answered. */
  | 'starting'
  | 'scanning'
  /** The user said no. Every other way in stays open. */
  | 'denied'
  /** No camera, or the browser does not offer one. */
  | 'unavailable';

/** How often a frame is sampled. Frequent enough to feel live, cheap enough to idle. */
export const SCAN_INTERVAL_MILLIS = 300;

export interface CameraScanOptions {
  scanner: QrScanner;
  onScan: (payload: string) => void;
  /** Injected in tests; defaults to the browser's camera. */
  requestCamera?: () => Promise<MediaStream>;
  intervalMillis?: number;
}

/**
 * What the camera is asked for. The rear camera is the one pointed at another
 * device's screen, and the resolution is a stated need, not a nicety: without
 * it phones default to 640×480, which leaves a dense pairing symbol at two or
 * three pixels per module — below what any detector can read. `ideal` degrades
 * gracefully on hardware that has less to give.
 */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 2560 },
    height: { ideal: 1440 },
  },
};

const browserCamera = (): Promise<MediaStream> => {
  const media = navigator.mediaDevices as MediaDevices | undefined;
  if (media === undefined) {
    return Promise.reject(new Error('this browser exposes no camera'));
  }
  return media.getUserMedia(CAMERA_CONSTRAINTS);
};

const stopStream = (stream: MediaStream): void => {
  for (const track of stream.getTracks()) track.stop();
};

/** A denial is the user's choice; anything else is the platform falling short. */
const stateForFailure = (reason: unknown): CameraScanState =>
  reason instanceof Error && (reason.name === 'NotAllowedError' || reason.name === 'SecurityError')
    ? 'denied'
    : 'unavailable';

const useReleaseOnUnmount = (
  mounted: { current: boolean },
  release: () => void,
): void => {
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      release();
    };
  }, [mounted, release]);
};

export const useCameraScan = (options: CameraScanOptions) => {
  const { scanner, onScan, requestCamera = browserCamera } = options;

  const [state, setState] = useState<CameraScanState>('idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  // Read by the sampling loop, which must not fire again while a decode is in
  // flight — a slow decoder would otherwise queue frames without limit.
  const busyRef = useRef(false);

  const release = useCallback((): void => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current !== null) stopStream(streamRef.current);
    streamRef.current = null;
    busyRef.current = false;
    if (videoRef.current !== null) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback((): void => {
    release();
    setState('idle');
  }, [release]);

  const sample = useCallback(async (): Promise<void> => {
    const video = videoRef.current;
    if (video === null || busyRef.current) return;
    busyRef.current = true;
    try {
      const found = await scanner.scanImage(video);
      if (!mountedRef.current) return;
      if (found.length === 0) return;
      release();
      setState('idle');
      onScan(found[0]);
    } catch {
      // A frame that will not decode is the normal case, not a failure: the
      // camera is pointed at a wall, or the code is still out of focus.
    } finally {
      busyRef.current = false;
    }
  }, [onScan, release, scanner]);

  const start = useCallback((): void => {
    setState('starting');
    requestCamera()
      .then((stream) => {
        if (!mountedRef.current) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current !== null) videoRef.current.srcObject = stream;
        setState('scanning');
        timerRef.current = setInterval(() => {
          void sample();
        }, options.intervalMillis ?? SCAN_INTERVAL_MILLIS);
      })
      .catch((reason: unknown) => {
        if (!mountedRef.current) return;
        release();
        setState(stateForFailure(reason));
      });
  }, [options.intervalMillis, release, requestCamera, sample]);

  // Unmounting must release the camera even mid-scan; the dialog closing is the
  // commonest way this component goes away.
  useReleaseOnUnmount(mountedRef, release);

  return { state, start, stop, videoRef };
};
