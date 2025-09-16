export type Platform = "mac" | "windows" | "linux" | "unknown";

export type HotkeyPattern =
  | string
  | string[]
  | {
      patterns: string | string[];
      sequenceTimeoutMs?: number;
    };

export type ParsedPattern = {
  key: string | null;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  isSequence: boolean;
  sequence: Array<{
    key: string | null;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    alt: boolean;
  }>;
};

export type MatchOptions = {
  platform?: Platform;
  caseSensitive?: boolean;
  treatModAsPlatformMeta?: boolean;
};

export type FormatOptions = {
  platform?: Platform;
  useSymbols?: boolean;
  separator?: string;
};

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

export const modifierAliases: Record<
  string,
  "ctrl" | "meta" | "shift" | "alt" | "mod"
> = {
  control: "ctrl",
  ctrl: "ctrl",
  command: "meta",
  cmd: "meta",
  meta: "meta",
  shift: "shift",
  option: "alt",
  alt: "alt",
  mod: "mod"
};

export const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "unknown";

  const p = navigator.platform.toLowerCase();

  if (p.includes("mac")) return "mac";
  if (p.includes("win")) return "windows";
  if (p.includes("linux")) return "linux";

  return "unknown";
};

const normalizeKeyName = (raw: string, caseSensitive: boolean): string => {
  const k = raw.trim();
  const lower = k.toLowerCase();

  if (specialKeyMap[lower] !== undefined) return specialKeyMap[lower];
  if (lower.length === 1) return caseSensitive ? k : lower;

  return caseSensitive
    ? k
    : k.length === 1
      ? lower
      : k.charAt(0).toUpperCase() + k.slice(1);
};

export const parseSingle = (pattern: string, options?: MatchOptions) => {
  const platform = options?.platform ?? detectPlatform();
  const caseSensitive = options?.caseSensitive ?? false;
  const treatModAsPlatformMeta = options?.treatModAsPlatformMeta ?? true;

  const tokens = pattern
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);

  let ctrl = false;
  let meta = false;
  let shift = false;
  let alt = false;
  let key: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const alias = modifierAliases[lower];

    if (alias === "mod" && treatModAsPlatformMeta) {
      if (platform === "mac") meta = true;
      else ctrl = true;
      continue;
    }

    if (alias === "ctrl") {
      ctrl = true;
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

  return { key, ctrl, meta, shift, alt };
};

export const parsePattern = (
  pattern: string,
  options?: MatchOptions
): ParsedPattern => {
  const sequenceParts = pattern
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (sequenceParts.length <= 1) {
    const single = parseSingle(pattern, options);
    return { ...single, isSequence: false, sequence: [single] };
  }

  const sequence = sequenceParts.map((p) => parseSingle(p, options));

  return {
    key: null,
    ctrl: false,
    meta: false,
    shift: false,
    alt: false,
    isSequence: true,
    sequence
  };
};

export const eventKeyComparable = (
  event: KeyboardEvent,
  caseSensitive: boolean
): string => {
  const k = event.key;
  if (k.length === 1) return caseSensitive ? k : k.toLowerCase();
  return k;
};

export const matchHotkey = (
  event: KeyboardEvent,
  pattern: string,
  options?: MatchOptions
): boolean => {
  const parsed = parsePattern(pattern, options);

  if (parsed.isSequence) return false;

  const caseSensitive = options?.caseSensitive ?? false;

  if (parsed.ctrl !== !!event.ctrlKey) return false;
  if (parsed.meta !== !!event.metaKey) return false;
  if (parsed.shift !== !!event.shiftKey) return false;
  if (parsed.alt !== !!event.altKey) return false;
  if (parsed.key === null) return true;

  return (
    eventKeyComparable(event, caseSensitive) ===
    (parsed.key.length === 1
      ? caseSensitive
        ? parsed.key
        : parsed.key.toLowerCase()
      : parsed.key)
  );
};

export const matchAnyHotkey = (
  event: KeyboardEvent,
  patterns: string | string[],
  options?: MatchOptions
): boolean => {
  const list = Array.isArray(patterns) ? patterns : [patterns];

  for (const p of list) {
    if (matchHotkey(event, p, options)) return true;
  }

  return false;
};

export const createHotkeyHandler = (
  patterns: HotkeyPattern,
  handler: (event: KeyboardEvent) => void,
  options?: MatchOptions
) => {
  const platform = options?.platform ?? detectPlatform();
  const sequenceTimeoutMs =
    typeof patterns === "string" || Array.isArray(patterns)
      ? 0
      : (patterns.sequenceTimeoutMs ?? 600);
  const list =
    typeof patterns === "string" || Array.isArray(patterns)
      ? patterns
      : patterns.patterns;
  const normalized = Array.isArray(list) ? list : [list];

  if (normalized.some((p) => parsePattern(p, options).isSequence)) {
    let index = 0;
    let timer: number | null = null;

    const firstSeq = normalized.find(
      (p) => parsePattern(p, options).isSequence
    ) as string;
    const seq = parsePattern(firstSeq, options).sequence;

    return (event: KeyboardEvent) => {
      const current = seq[index];
      const modMatch =
        current.ctrl === !!event.ctrlKey &&
        current.meta === !!event.metaKey &&
        current.shift === !!event.shiftKey &&
        current.alt === !!event.altKey;
      const keyMatch =
        current.key === null ||
        eventKeyComparable(event, options?.caseSensitive ?? false) ===
          (current.key.length === 1
            ? options?.caseSensitive
              ? current.key
              : current.key.toLowerCase()
            : current.key);

      if (modMatch && keyMatch) {
        index += 1;

        if (index === seq.length) {
          index = 0;

          if (timer) {
            window.clearTimeout(timer);
            timer = null;
          }

          handler(event);
          return;
        }

        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          index = 0;
          timer = null;
        }, sequenceTimeoutMs) as unknown as number;
      } else {
        index = 0;

        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
      }
    };
  }

  return (event: KeyboardEvent) => {
    if (matchAnyHotkey(event, normalized, { ...options, platform }))
      handler(event);
  };
};

export const formatPattern = (
  pattern: string,
  options?: FormatOptions
): string => {
  const platform = options?.platform ?? detectPlatform();
  const useSymbols = options?.useSymbols ?? platform === "mac";
  const separator = options?.separator ?? (useSymbols ? "" : " + ");
  const parsed = parsePattern(pattern, { platform });
  const tokens: string[] = [];
  const push = (t: string) => tokens.push(t);

  const ctrlLabel = useSymbols ? "⌃" : "Ctrl";
  const metaLabel = useSymbols ? "⌘" : platform === "mac" ? "Command" : "Meta";
  const shiftLabel = useSymbols ? "⇧" : "Shift";
  const altLabel = useSymbols ? "⌥" : platform === "mac" ? "Option" : "Alt";

  const toKeyLabel = (k: string | null) => {
    if (!k) return "";
    if (k === " ") return useSymbols ? "␣" : "Space";
    return k.length === 1 ? k.toUpperCase() : k;
  };

  if (!parsed.isSequence) {
    if (parsed.ctrl) push(ctrlLabel);
    if (parsed.meta) push(metaLabel);
    if (parsed.shift) push(shiftLabel);
    if (parsed.alt) push(altLabel);
    if (parsed.key) push(toKeyLabel(parsed.key));
    return tokens.join(separator);
  }

  const parts = parsed.sequence.map((p) => {
    const t: string[] = [];
    if (p.ctrl) t.push(ctrlLabel);
    if (p.meta) t.push(metaLabel);
    if (p.shift) t.push(shiftLabel);
    if (p.alt) t.push(altLabel);
    if (p.key) t.push(toKeyLabel(p.key));
    return t.join(separator);
  });

  return parts.join(useSymbols ? " " : " then ");
};
