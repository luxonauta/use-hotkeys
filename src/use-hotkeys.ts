import * as React from "react";

export type HotkeysOptions = {
  eventType?: "keydown" | "keyup" | "keypress";
  target?: EventTarget | null;
  eventOptions?: AddEventListenerOptions | boolean;
  enabled?: boolean;
  requireCtrl?: boolean;
  requireMeta?: boolean;
  requireShift?: boolean;
  requireAlt?: boolean;
  returnState?: boolean;
};

export type HotkeyIndicatorState = {
  isActive: boolean;
  lastKey: string | null;
  lastEventType: "keydown" | "keyup" | "keypress" | null;
  pressCount: number;
  lastTriggeredAt: number | null;
  isCombinationActive: boolean;
};

export function useHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options?: Omit<HotkeysOptions, "returnState"> & { returnState?: false }
): void;

export function useHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: Omit<HotkeysOptions, "returnState"> & { returnState: true }
): HotkeyIndicatorState;

export function useHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: HotkeysOptions = {}
): void | HotkeyIndicatorState {
  const {
    eventType = "keydown",
    target,
    eventOptions,
    enabled = true,
    requireCtrl = false,
    requireMeta = false,
    requireShift = false,
    requireAlt = false,
    returnState = false
  } = options;

  const normalizedKeys = React.useMemo<Set<string>>(() => {
    const list = Array.isArray(keys) ? keys : [keys];
    return new Set(list.map(String));
  }, [keys]);

  const callbackRef = React.useRef<(event: KeyboardEvent) => void>(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const [indicator, setIndicator] = React.useState<HotkeyIndicatorState>({
    isActive: false,
    lastKey: null,
    lastEventType: null,
    pressCount: 0,
    lastTriggeredAt: null,
    isCombinationActive: false
  });

  const updateIndicatorOnTrigger = React.useCallback(
    (event: KeyboardEvent) => {
      setIndicator((prev) => ({
        isActive: event.type === "keydown" ? true : prev.isActive,
        lastKey: event.key ?? null,
        lastEventType: (event.type as "keydown" | "keyup" | "keypress") ?? null,
        pressCount: prev.pressCount + 1,
        lastTriggeredAt: Date.now(),
        isCombinationActive:
          (!!event.ctrlKey ||
            !!event.metaKey ||
            !!event.shiftKey ||
            !!event.altKey) &&
          (!requireCtrl || !!event.ctrlKey) &&
          (!requireMeta || !!event.metaKey) &&
          (!requireShift || !!event.shiftKey) &&
          (!requireAlt || !!event.altKey)
      }));
    },
    [requireCtrl, requireMeta, requireShift, requireAlt]
  );

  const matchEvent = React.useCallback(
    (event: KeyboardEvent): boolean => {
      if (!normalizedKeys.has(event.key)) return false;
      if (requireCtrl && !event.ctrlKey) return false;
      if (requireMeta && !event.metaKey) return false;
      if (requireShift && !event.shiftKey) return false;
      if (requireAlt && !event.altKey) return false;
      return true;
    },
    [normalizedKeys, requireCtrl, requireMeta, requireShift, requireAlt]
  );

  React.useEffect(() => {
    if (!enabled) return;

    const eventTarget: EventTarget | null =
      target ?? (typeof window !== "undefined" ? window : null);
    if (!eventTarget || !("addEventListener" in eventTarget)) return;

    const handlePrimary = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (!matchEvent(keyboardEvent)) return;
      if (returnState) updateIndicatorOnTrigger(keyboardEvent);
      callbackRef.current(keyboardEvent);
    };

    const handleKeyUpForDeactivation = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (!normalizedKeys.has(keyboardEvent.key)) return;
      setIndicator((prev) => ({
        ...prev,
        isActive: false,
        lastEventType: "keyup",
        lastKey: keyboardEvent.key ?? prev.lastKey,
        isCombinationActive: false
      }));
    };

    eventTarget.addEventListener(
      eventType,
      handlePrimary as EventListener,
      eventOptions
    );

    let attachedKeyUpListener = false;
    if (returnState && eventType === "keydown") {
      eventTarget.addEventListener(
        "keyup",
        handleKeyUpForDeactivation as EventListener,
        eventOptions
      );
      attachedKeyUpListener = true;
    }

    return () => {
      eventTarget.removeEventListener(
        eventType,
        handlePrimary as EventListener,
        eventOptions
      );
      if (attachedKeyUpListener) {
        eventTarget.removeEventListener(
          "keyup",
          handleKeyUpForDeactivation as EventListener,
          eventOptions
        );
      }
    };
  }, [
    enabled,
    target,
    eventType,
    eventOptions,
    matchEvent,
    updateIndicatorOnTrigger,
    returnState,
    normalizedKeys
  ]);

  if (returnState) return indicator;
}
