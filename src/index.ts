export { default, useHotkeysWithState } from "./use-hotkeys";
export type { hotkeysConfig, hotkeyState } from "./use-hotkeys";

export {
  specialKeyMap,
  modifierAliasMap,
  detectOperatingSystem,
  normalizeKeyName,
  parseSinglePattern,
  parsePattern,
  toComparableEventKey,
  matchHotkey,
  matchAnyHotkey,
  createHotkeyHandler,
  formatPattern
} from "./hotkeys-patterns";

export type {
  operatingSystem,
  hotkeyPattern,
  parsedHotkeyPattern,
  matchOptions,
  formatOptions
} from "./hotkeys-patterns";
