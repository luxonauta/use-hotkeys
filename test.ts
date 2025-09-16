import { useHotkeys } from "./src/use-hotkeys";

useHotkeys(["z", "y"], (e) => undoOrRedo(e), { requireMeta: true });
const indicator = useHotkeys("k", () => openCommandPalette(), {
  returnState: true
});
