import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";

const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE_PX = 12;

type Args = {
  mobilePressSplit: boolean;
  disabled?: boolean;
  onShort: () => void;
  onLong: () => void;
  onDesktopClick: () => void;
};

export const useReaderAiWavePress = ({ mobilePressSplit, disabled, onShort, onLong, onDesktopClick }: Args) => {
  const longFiredRef = useRef(false);
  const suppressClickRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current == null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const movedTooFar = (e: ReactPointerEvent) => {
    const start = startRef.current;
    if (!start) return false;
    return Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE_PX;
  };

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (disabled || !mobilePressSplit) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      longFiredRef.current = false;
      suppressClickRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        longFiredRef.current = true;
        suppressClickRef.current = true;
        onLong();
      }, LONG_PRESS_MS);
    },
    [mobilePressSplit, disabled, onLong, clearTimer],
  );

  const finishPointer = useCallback(
    (e: ReactPointerEvent) => {
      if (disabled || !mobilePressSplit) return;
      clearTimer();
      if (movedTooFar(e)) {
        startRef.current = null;
        return;
      }
      if (longFiredRef.current) {
        startRef.current = null;
        return;
      }
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        suppressClickRef.current = true;
        onShort();
      }
      startRef.current = null;
    },
    [mobilePressSplit, disabled, onShort, clearTimer],
  );

  const onPointerCancel = useCallback(() => {
    clearTimer();
    startRef.current = null;
    longFiredRef.current = false;
  }, [clearTimer]);

  const onClick = useCallback(() => {
    if (disabled) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (mobilePressSplit) onShort();
    else onDesktopClick();
  }, [mobilePressSplit, disabled, onShort, onDesktopClick]);

  const onContextMenu = mobilePressSplit
    ? (e: SyntheticEvent) => {
        e.preventDefault();
      }
    : undefined;

  return {
    onPointerDown,
    onPointerUp: finishPointer,
    onPointerCancel,
    onPointerLeave: onPointerCancel,
    onClick,
    onContextMenu,
  };
};