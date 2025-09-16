# `useHotkeys`

> A React hook for handling keyboard shortcuts and hotkey sequences.

[![npm version](https://img.shields.io/npm/v/@luxonauta/use-hotkeys.svg?color=blue&logo=npm)](https://www.npmjs.com/package/@luxonauta/use-hotkeys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](license)
[![React >=18](https://img.shields.io/badge/react-%3E=18-61dafb?logo=react)](https://react.dev)

## Installation

```bash
npm install @luxonauta/use-hotkeys
```

## Basic Usage

```tsx
import useHotkeys from "@luxonauta/use-hotkeys";

export const Component = () => {
  useHotkeys("Control+k", (event) => {
    event.preventDefault();
    console.log("Control+K was pressed");
  });

  return <p>Press Control+K</p>;
};
```

## Usage with State

```tsx
import { useHotkeysWithState } from "@luxonauta/use-hotkeys";

export const Component = () => {
  const indicator = useHotkeysWithState(
    "Escape",
    () => {
      console.log("Escape pressed");
    },
    { returnState: true }
  );

  return (
    <div>
      <p>Press Escape</p>
      <pre>{JSON.stringify(indicator, null, 2)}</pre>
    </div>
  );
};
```

## API Reference

### `useHotkeys`

```ts
useHotkeys(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options?: HotkeysOptions
): void
```

### `useHotkeysWithState`

```ts
useHotkeysWithState(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  options?: HotkeysOptions & { returnState: true }
): HotkeyIndicatorState
```

### Options (`HotkeysOptions`)

| Option         | Type                                 | Default     | Description                                    |
| -------------- | ------------------------------------ | ----------- | ---------------------------------------------- |
| `eventType`    | `"keydown" \| "keyup" \| "keypress"` | `"keydown"` | Which event to listen for                      |
| `target`       | `EventTarget \| null`                | `window`    | DOM target for the event listener              |
| `eventOptions` | `AddEventListenerOptions \| boolean` | `false`     | Options for `addEventListener`                 |
| `enabled`      | `boolean`                            | `true`      | Enable or disable the hotkey                   |
| `requireCtrl`  | `boolean`                            | `false`     | Require the `Control` key                      |
| `requireMeta`  | `boolean`                            | `false`     | Require the `Meta` key (`⌘` on Mac)            |
| `requireShift` | `boolean`                            | `false`     | Require the `Shift` key                        |
| `requireAlt`   | `boolean`                            | `false`     | Require the `Alt` key                          |
| `returnState`  | `boolean`                            | `false`     | Whether to return state info (`isActive`, etc) |

### Indicator State (`HotkeyIndicatorState`)

| Property              | Type      | Description                                      |
| --------------------- | --------- | ------------------------------------------------ |
| `isActive`            | `boolean` | Whether the key is currently pressed             |
| `lastKey`             | `string?` | Last key pressed                                 |
| `lastEventType`       | `string?` | Last event type (`keydown`, `keyup`, `keypress`) |
| `pressCount`          | `number`  | Total number of times triggered                  |
| `lastTriggeredAt`     | `number?` | Timestamp of last trigger                        |
| `isCombinationActive` | `boolean` | Whether required modifiers are pressed           |

## Pattern Utilities

The package also includes helpers for parsing and formatting hotkey patterns:

```tsx
import {
  matchHotkey,
  matchAnyHotkey,
  createHotkeyHandler,
  formatPattern
} from "@luxonauta/use-hotkeys";
```

- `matchHotkey(event, pattern, options?)`: Check if an event matches a pattern like `Control + K`;
- `matchAnyHotkey(event, [patterns], options?)`: Check against multiple patterns.
- `createHotkeyHandler(patterns, handler, options?)`: Create an event handler for simple or sequence-based hotkeys.
- `formatPattern(pattern, options?)`: Format a pattern for display:
  ```tsx
  formatPattern("Control+k"); // => "Ctrl + K"
  formatPattern("g g"); // => "G then G"
  ```

## Advanced Usage

### Hotkey Sequences

```tsx
import { createHotkeyHandler } from "@luxonauta/use-hotkeys";

export const Component = () => {
  React.useEffect(() => {
    const handler = createHotkeyHandler(
      { patterns: "g g", sequenceTimeoutMs: 600 },
      () => {
        console.log("Sequence G then G matched");
      }
    );

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, []);

  return <p>Press "g g"</p>;
};
```

### Formatting for Display

```tsx
import { formatPattern } from "@luxonauta/use-hotkeys";

console.log(formatPattern("Control+k")); // Ctrl + K
console.log(formatPattern("Meta+Shift+p")); // ⌘⇧P (on macOS)
```

---

## Best Practices

1. **Scope your hotkeys**: Pass a `target` to bind hotkeys only inside a component;
2. **Respect accessibility**: Do not override default browser shortcuts without a good reason;
3. **Keep patterns simple**: Complex sequences can confuse users.

## License

[MIT](license)
