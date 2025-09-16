/**
 * Operating system label used to resolve platform-specific behavior.
 */
export type operatingSystem = "mac" | "windows" | "linux" | "unknown";

/**
 * Declarative hotkey pattern or list of patterns.
 * Supports simple patterns like "Control + K" and sequences like "G G".
 */
export type hotkeyPattern =
  | string
  | string[]
  | {
      patterns: string | string[];
      sequenceTimeoutMs?: number;
    };

/**
 * Parsed representation of a hotkey pattern.
 */
export type parsedHotkeyPattern = {
  key: string | null;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  isSequence: boolean;
  sequence: Array<{
    key: string | null;
    control: boolean;
    meta: boolean;
    shift: boolean;
    alt: boolean;
  }>;
};

/**
 * Options used for matching events to patterns.
 */
export type matchOptions = {
  platform?: operatingSystem;
  caseSensitive?: boolean;
  treatModAsPlatformMeta?: boolean;
};

/**
 * Options used for formatting patterns for display.
 */
export type formatOptions = {
  platform?: operatingSystem;
  useSymbols?: boolean;
  separator?: string;
};

/**
 * Map of common aliases to DOM KeyboardEvent.key values.
 */
export const specialKeyMap: Record<string, string> = {
  esc: "Escape",
  escape: "Escape",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  space: " ",
  spacebar: " ",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  arrowup: "ArrowUp",
  up: "ArrowUp",
  arrowdown: "ArrowDown",
  down: "ArrowDown",
  arrowleft: "ArrowLeft",
  left: "ArrowLeft",
  arrowright: "ArrowRight",
  right: "ArrowRight",
  pageup: "PageUp",
  pagedown: "PageDown",
  home: "Home",
  end: "End"
};

/**
 * Aliases for modifier tokens used in patterns.
 */
export const modifierAliasMap: Record<
  string,
  "control" | "meta" | "shift" | "alt" | "mod"
> = {
  control: "control",
  ctrl: "control",
  command: "meta",
  cmd: "meta",
  meta: "meta",
  shift: "shift",
  option: "alt",
  alt: "alt",
  mod: "mod"
};

/**
 * Returns the operating system using non-deprecated APIs.
 * Prefers User-Agent Client Hints (navigator.userAgentData), with safe fallbacks.
 */
export const detectOperatingSystem = (): operatingSystem => {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  // Chromium-based: User-Agent Client Hints
  // Examples: "Windows", "macOS", "Linux", "Android", "iOS", "Chrome OS"
  const uaDataPlatform = (
    navigator as unknown as { userAgentData?: { platform?: string } }
  ).userAgentData?.platform;

  if (uaDataPlatform) {
    const label = uaDataPlatform.toLowerCase();

    if (label.includes("mac")) {
      return "mac";
    }

    if (label.includes("win")) {
      return "windows";
    }

    if (label.includes("linux")) {
      return "linux";
    }

    // Chrome OS reports "Chrome OS"
    if (label.includes("chrome os")) {
      return "linux";
    }

    return "unknown";
  }

  // Fallback: parse navigator.userAgent (still widely supported)
  // Covers iOS/iPadOS reporting as mac-like in some contexts.
  const ua = navigator.userAgent.toLowerCase();

  // iOS/iPadOS often behave like macOS for shortcuts (use "meta" as primary)
  if (
    ua.includes("mac os x") ||
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    return "mac";
  }

  if (ua.includes("windows")) {
    return "windows";
  }

  if (ua.includes("linux") || ua.includes("x11")) {
    return "linux";
  }

  return "unknown";
};

/**
 * Normalizes a raw key token from a pattern into a comparable key string.
 *
 * @param raw Raw token from the pattern.
 * @param caseSensitive Whether to preserve character case for single letters.
 * @returns Normalized key name.
 */
export const normalizeKeyName = (
  raw: string,
  caseSensitive: boolean
): string => {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (specialKeyMap[lower] !== undefined) {
    return specialKeyMap[lower];
  }

  if (lower.length === 1) {
    return caseSensitive ? trimmed : lower;
  }

  return caseSensitive
    ? trimmed
    : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Parses a single pattern token group like "Control+k" or "Shift+Enter".
 *
 * @param pattern Pattern string to parse.
 * @param options Matching options.
 * @returns Parsed single-step structure.
 */
export const parseSinglePattern = (pattern: string, options?: matchOptions) => {
  const platform = options?.platform ?? detectOperatingSystem();
  const caseSensitive = options?.caseSensitive ?? false;
  const treatModAsPlatformMeta = options?.treatModAsPlatformMeta ?? true;

  const tokens = pattern
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  let control = false;
  let meta = false;
  let shift = false;
  let alt = false;
  let key: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const alias = modifierAliasMap[lower];

    if (alias === "mod" && treatModAsPlatformMeta) {
      if (platform === "mac") {
        meta = true;
      } else {
        control = true;
      }

      continue;
    }

    if (alias === "control") {
      control = true;
      continue;
    }

    if (alias === "meta") {
      meta = true;
      continue;
    }

    if (alias === "shift") {
      shift = true;
      continue;
    }

    if (alias === "alt") {
      alt = true;
      continue;
    }

    key = normalizeKeyName(token, caseSensitive);
  }

  return { key, control, meta, shift, alt };
};

/**
 * Parses a full hotkey pattern, supporting sequences like "g g" or "Control+k Control+c".
 *
 * @param pattern Pattern to parse.
 * @param options Matching options.
 * @returns Parsed pattern with sequence awareness.
 */
export const parsePattern = (
  pattern: string,
  options?: matchOptions
): parsedHotkeyPattern => {
  const sequenceParts = pattern
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (sequenceParts.length <= 1) {
    const single = parseSinglePattern(pattern, options);
    return { ...single, isSequence: false, sequence: [single] };
  }

  const sequence = sequenceParts.map((part) =>
    parseSinglePattern(part, options)
  );

  return {
    key: null,
    control: false,
    meta: false,
    shift: false,
    alt: false,
    isSequence: true,
    sequence
  };
};

/**
 * Returns a comparable key value from a KeyboardEvent based on case sensitivity.
 *
 * @param event Keyboard event to read.
 * @param caseSensitive Whether to preserve character case for single letters.
 * @returns Comparable key.
 */
export const toComparableEventKey = (
  event: KeyboardEvent,
  caseSensitive: boolean
): string => {
  const key = event.key;
  if (key.length === 1) {
    return caseSensitive ? key : key.toLowerCase();
  }

  return key;
};

/**
 * Checks if a KeyboardEvent matches a non-sequence pattern like "Control+k".
 *
 * @param event Keyboard event to test.
 * @param pattern Pattern to match against.
 * @param options Matching options.
 * @returns True when the event matches the pattern.
 */
export const matchHotkey = (
  event: KeyboardEvent,
  pattern: string,
  options?: matchOptions
): boolean => {
  const parsed = parsePattern(pattern, options);

  if (parsed.isSequence) {
    return false;
  }

  const caseSensitive = options?.caseSensitive ?? false;

  if (parsed.control !== !!event.ctrlKey) {
    return false;
  }

  if (parsed.meta !== !!event.metaKey) {
    return false;
  }

  if (parsed.shift !== !!event.shiftKey) {
    return false;
  }

  if (parsed.alt !== !!event.altKey) {
    return false;
  }

  if (parsed.key === null) {
    return true;
  }

  const comparable = toComparableEventKey(event, caseSensitive);
  const expected =
    parsed.key.length === 1
      ? caseSensitive
        ? parsed.key
        : parsed.key.toLowerCase()
      : parsed.key;

  return comparable === expected;
};

/**
 * Checks if a KeyboardEvent matches any item in a list of non-sequence patterns.
 *
 * @param event Keyboard event to test.
 * @param patterns Single pattern or list of patterns.
 * @param options Matching options.
 * @returns True when any pattern matches.
 */
export const matchAnyHotkey = (
  event: KeyboardEvent,
  patterns: string | string[],
  options?: matchOptions
): boolean => {
  const list = Array.isArray(patterns) ? patterns : [patterns];

  for (const item of list) {
    if (matchHotkey(event, item, options)) {
      return true;
    }
  }

  return false;
};

/**
 * Creates a handler that triggers for simple patterns or a single sequence.
 * When a sequence is provided, the steps must be completed within the timeout window.
 *
 * @param patterns Simple pattern(s) or one sequence pattern.
 * @param handler Function to run on match.
 * @param options Matching options.
 * @returns Event handler ready to be attached to key events.
 */
export const createHotkeyHandler = (
  patterns: hotkeyPattern,
  handler: (event: KeyboardEvent) => void,
  options?: matchOptions
) => {
  const platform = options?.platform ?? detectOperatingSystem();
  const sequenceTimeoutMs =
    typeof patterns === "string" || Array.isArray(patterns)
      ? 0
      : (patterns.sequenceTimeoutMs ?? 600);

  const list =
    typeof patterns === "string" || Array.isArray(patterns)
      ? patterns
      : patterns.patterns;

  const normalized = Array.isArray(list) ? list : [list];

  if (normalized.some((value) => parsePattern(value, options).isSequence)) {
    let sequenceIndex = 0;
    let timer: ReturnType<typeof window.setTimeout> | null = null;

    const firstSequence = normalized.find(
      (value) => parsePattern(value, options).isSequence
    ) as string;

    const sequence = parsePattern(firstSequence, options).sequence;

    return (event: KeyboardEvent) => {
      const current = sequence[sequenceIndex];

      const modifiersMatch =
        current.control === !!event.ctrlKey &&
        current.meta === !!event.metaKey &&
        current.shift === !!event.shiftKey &&
        current.alt === !!event.altKey;

      const keyMatch =
        current.key === null ||
        toComparableEventKey(event, options?.caseSensitive ?? false) ===
          (current.key.length === 1
            ? options?.caseSensitive
              ? current.key
              : current.key.toLowerCase()
            : current.key);

      if (modifiersMatch && keyMatch) {
        sequenceIndex += 1;

        if (sequenceIndex === sequence.length) {
          sequenceIndex = 0;

          if (timer) {
            window.clearTimeout(timer);
            timer = null;
          }

          handler(event);
          return;
        }

        if (timer) {
          window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
          sequenceIndex = 0;
          timer = null;
        }, sequenceTimeoutMs);

        return;
      }

      sequenceIndex = 0;

      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
  }

  return (event: KeyboardEvent) => {
    if (matchAnyHotkey(event, normalized, { ...options, platform })) {
      handler(event);
    }
  };
};

/**
 * Formats a pattern to a human-friendly label, using symbols on macOS by default.
 *
 * @param pattern Pattern to format.
 * @param options Formatting options.
 * @returns Formatted, user-facing label.
 */
export const formatPattern = (
  pattern: string,
  options?: formatOptions
): string => {
  const platform = options?.platform ?? detectOperatingSystem();
  const useSymbols = options?.useSymbols ?? platform === "mac";
  const separator = options?.separator ?? (useSymbols ? "" : " + ");
  const parsed = parsePattern(pattern, { platform });
  const tokens: string[] = [];

  const controlLabel = useSymbols ? "⌃" : "Ctrl";
  const metaLabel = useSymbols ? "⌘" : platform === "mac" ? "Command" : "Meta";
  const shiftLabel = useSymbols ? "⇧" : "Shift";
  const altLabel = useSymbols ? "⌥" : platform === "mac" ? "Option" : "Alt";

  const toKeyLabel = (key: string | null) => {
    if (!key) {
      return "";
    }

    if (key === " ") {
      return useSymbols ? "␣" : "Space";
    }

    return key.length === 1 ? key.toUpperCase() : key;
  };

  if (!parsed.isSequence) {
    if (parsed.control) {
      tokens.push(controlLabel);
    }

    if (parsed.meta) {
      tokens.push(metaLabel);
    }

    if (parsed.shift) {
      tokens.push(shiftLabel);
    }

    if (parsed.alt) {
      tokens.push(altLabel);
    }

    if (parsed.key) {
      tokens.push(toKeyLabel(parsed.key));
    }

    return tokens.join(separator);
  }

  const parts = parsed.sequence.map((step) => {
    const stepTokens: string[] = [];
    if (step.control) {
      stepTokens.push(controlLabel);
    }

    if (step.meta) {
      stepTokens.push(metaLabel);
    }

    if (step.shift) {
      stepTokens.push(shiftLabel);
    }

    if (step.alt) {
      stepTokens.push(altLabel);
    }

    if (step.key) {
      stepTokens.push(toKeyLabel(step.key));
    }

    return stepTokens.join(separator);
  });

  return parts.join(useSymbols ? " " : " then ");
};
