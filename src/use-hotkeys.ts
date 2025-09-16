import * as React from "react";

/**
 * Configuration object for the useHotkeys hook.
 */
export type hotkeysConfig = {
  /**
   * Keyboard event type to listen for.
   */
  eventType?: "keydown" | "keyup" | "keypress";
  /**
   * Target where listeners will be attached. Defaults to window in the browser.
   */
  target?: EventTarget | null;
  /**
   * Options passed to addEventListener.
   */
  eventOptions?: AddEventListenerOptions | boolean;
  /**
   * Enables or disables the listener attachment.
   */
  enabled?: boolean;
  /**
   * Requires Control key to be pressed.
   */
  requireControl?: boolean;
  /**
   * Requires Meta key to be pressed.
   */
  requireMeta?: boolean;
  /**
   * Requires Shift key to be pressed.
   */
  requireShift?: boolean;
  /**
   * Requires Alt key to be pressed.
   */
  requireAlt?: boolean;
  /**
   * When true, returns a state object for UI feedback.
   */
  returnState?: boolean;
};

/**
 * Observable state returned when returnState is true.
 */
export type hotkeyState = {
  isActive: boolean;
  lastKey: string | null;
  lastEventType: "keydown" | "keyup" | "keypress" | null;
  pressCount: number;
  lastTriggeredAt: number | null;
  isCombinationActive: boolean;
};

export type listenerCapable = {
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) => void;
};

export const isListenerCapable = (
  value: EventTarget | null
): value is EventTarget & listenerCapable => {
  return (
    !!value && "addEventListener" in value && "removeEventListener" in value
  );
};

/**
 * Registers keyboard hotkeys and invokes a callback when matched.
 * Does not return state.
 *
 * @param keys List of keys to match against `event.key`.
 * @param callback Function invoked when a matching event is fired.
 * @param options Behavior configuration.
 */
const useHotkeys = (
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options?: Omit<hotkeysConfig, "returnState"> & { returnState?: false }
): void => {
  internalUseHotkeys(keys, callback, options ?? {});
};

/**
 * Registers keyboard hotkeys, invokes a callback when matched,
 * and returns a state object for UI feedback.
 *
 * @param keys List of keys to match against `event.key`.
 * @param callback Function invoked when a matching event is fired.
 * @param options Behavior configuration with `returnState: true`.
 * @returns hotkeyState for rendering visual indicators.
 */
export const useHotkeysWithState = (
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: Omit<hotkeysConfig, "returnState"> & { returnState: true }
): hotkeyState => {
  return internalUseHotkeys(keys, callback, options) as hotkeyState;
};

const internalUseHotkeys = (
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: hotkeysConfig
): void | hotkeyState => {
  const {
    eventType = "keydown",
    target,
    eventOptions,
    enabled = true,
    requireControl = false,
    requireMeta = false,
    requireShift = false,
    requireAlt = false,
    returnState = false
  } = options;

  const normalizedKeys = React.useMemo<Set<string>>(() => {
    const list = Array.isArray(keys) ? keys : [keys];
    return new Set(list.map((value) => String(value)));
  }, [keys]);

  const callbackRef = React.useRef<(event: KeyboardEvent) => void>(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const [indicator, setIndicator] = React.useState<hotkeyState>({
    isActive: false,
    lastKey: null,
    lastEventType: null,
    pressCount: 0,
    lastTriggeredAt: null,
    isCombinationActive: false
  });

  const updateStateOnTrigger = React.useCallback(
    (keyboardEvent: KeyboardEvent) => {
      setIndicator((previousState) => ({
        isActive:
          keyboardEvent.type === "keydown" ? true : previousState.isActive,
        lastKey: keyboardEvent.key ?? null,
        lastEventType:
          (keyboardEvent.type as "keydown" | "keyup" | "keypress") ?? null,
        pressCount: previousState.pressCount + 1,
        lastTriggeredAt: Date.now(),
        isCombinationActive:
          (!!keyboardEvent.ctrlKey ||
            !!keyboardEvent.metaKey ||
            !!keyboardEvent.shiftKey ||
            !!keyboardEvent.altKey) &&
          (!requireControl || !!keyboardEvent.ctrlKey) &&
          (!requireMeta || !!keyboardEvent.metaKey) &&
          (!requireShift || !!keyboardEvent.shiftKey) &&
          (!requireAlt || !!keyboardEvent.altKey)
      }));
    },
    [requireControl, requireMeta, requireShift, requireAlt]
  );

  const doesEventMatch = React.useCallback(
    (keyboardEvent: KeyboardEvent): boolean => {
      if (!normalizedKeys.has(keyboardEvent.key)) {
        return false;
      }

      if (requireControl && !keyboardEvent.ctrlKey) {
        return false;
      }

      if (requireMeta && !keyboardEvent.metaKey) {
        return false;
      }

      if (requireShift && !keyboardEvent.shiftKey) {
        return false;
      }

      if (requireAlt && !keyboardEvent.altKey) {
        return false;
      }

      return true;
    },
    [normalizedKeys, requireControl, requireMeta, requireShift, requireAlt]
  );

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const defaultTarget: EventTarget | null =
      typeof window !== "undefined" ? window : null;
    const eventTarget: EventTarget | null = target ?? defaultTarget;

    if (!isListenerCapable(eventTarget)) {
      return;
    }

    const handlePrimaryEvent = (keyboardEvent: Event) => {
      const eventAsKeyboardEvent = keyboardEvent as KeyboardEvent;

      if (!doesEventMatch(eventAsKeyboardEvent)) {
        return;
      }

      if (returnState) {
        updateStateOnTrigger(eventAsKeyboardEvent);
      }

      callbackRef.current(eventAsKeyboardEvent);
    };

    const handleKeyUpDeactivation = (keyboardEvent: Event) => {
      const eventAsKeyboardEvent = keyboardEvent as KeyboardEvent;

      if (!normalizedKeys.has(eventAsKeyboardEvent.key)) {
        return;
      }

      setIndicator((previousState) => ({
        ...previousState,
        isActive: false,
        lastEventType: "keyup",
        lastKey: eventAsKeyboardEvent.key ?? previousState.lastKey,
        isCombinationActive: false
      }));
    };

    eventTarget.addEventListener(
      eventType,
      handlePrimaryEvent as EventListener,
      eventOptions
    );

    let keyUpListenerAttached = false;

    if (returnState && eventType === "keydown") {
      eventTarget.addEventListener(
        "keyup",
        handleKeyUpDeactivation as EventListener,
        eventOptions
      );

      keyUpListenerAttached = true;
    }

    return () => {
      eventTarget.removeEventListener(
        eventType,
        handlePrimaryEvent as EventListener,
        eventOptions
      );

      if (keyUpListenerAttached) {
        eventTarget.removeEventListener(
          "keyup",
          handleKeyUpDeactivation as EventListener,
          eventOptions
        );
      }
    };
  }, [
    enabled,
    target,
    eventType,
    eventOptions,
    doesEventMatch,
    updateStateOnTrigger,
    returnState,
    normalizedKeys
  ]);

  if (returnState) {
    return indicator;
  }
};

export default useHotkeys;
