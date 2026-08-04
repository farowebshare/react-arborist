import { useCallback, useEffect, useMemo, useRef } from "react";

export type AnimationFrameThrottle = {
  /** Run the callback on the next animation frame. When schedule is called
   * multiple times within the same frame, only the last callback runs. */
  schedule: (callback: () => void) => void;
  /** Run the callback that is waiting for the next frame right now. */
  flush: () => void;
};

/**
 * Runs callbacks at most once per animation frame, with an escape hatch to run
 * the waiting callback synchronously when its result is needed immediately.
 */
export function useAnimationFrameThrottle(): AnimationFrameThrottle {
  const frame = useRef<number | null>(null);
  const pending = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      pending.current = null;
    },
    [],
  );

  const runPending = useCallback(() => {
    const callback = pending.current;
    pending.current = null;
    callback?.();
  }, []);

  const schedule = useCallback(
    (callback: () => void) => {
      pending.current = callback;
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        runPending();
      });
    },
    [runPending],
  );

  const flush = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    runPending();
  }, [runPending]);

  return useMemo(() => ({ schedule, flush }), [schedule, flush]);
}
