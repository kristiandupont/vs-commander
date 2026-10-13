import { DirectoryItem } from "./types";

// A pane's selection as row indices (index 0 is the ".." row). This is what the
// keyboard and mouse handlers work with.
export interface PaneSelection {
  selected: Set<number>;
  focus: number;
  anchor: number;
}

// The same selection identified by URI, so it can be carried across a reload
// in which rows were added, removed or re-sorted
export interface PaneSelectionKeys {
  selected: string[];
  focus: string;
  anchor: string;
}

const PARENT_KEY = "..";

export const initialSelection = (): PaneSelection => ({
  selected: new Set([0]),
  focus: 0,
  anchor: 0,
});

export const selectionOfUri = (uri: string): PaneSelectionKeys => ({
  selected: [uri],
  focus: uri,
  anchor: uri,
});

function keyAt(contents: DirectoryItem[], index: number): string | undefined {
  return index === 0 ? PARENT_KEY : contents[index - 1]?.uri;
}

function indexOfKey(contents: DirectoryItem[], key: string): number {
  if (key === PARENT_KEY) return 0;
  const i = contents.findIndex((item) => item.uri === key);
  return i === -1 ? -1 : i + 1;
}

export function selectionToKeys(
  contents: DirectoryItem[],
  selection: PaneSelection,
): PaneSelectionKeys {
  return {
    selected: [...selection.selected]
      .map((i) => keyAt(contents, i))
      .filter((key): key is string => key !== undefined),
    focus: keyAt(contents, selection.focus) ?? PARENT_KEY,
    anchor: keyAt(contents, selection.anchor) ?? PARENT_KEY,
  };
}

/** Maps `keys` onto `contents`. If the focused item is gone, focus stays at
 * `fallbackFocus` clamped to the list; if no selected item remains, the
 * focused row becomes the selection. */
export function selectionFromKeys(
  contents: DirectoryItem[],
  keys: PaneSelectionKeys,
  fallbackFocus: number,
): PaneSelection {
  const focusIndex = indexOfKey(contents, keys.focus);
  const focus =
    focusIndex !== -1
      ? focusIndex
      : Math.max(0, Math.min(fallbackFocus, contents.length));
  const selected = new Set(
    keys.selected.map((key) => indexOfKey(contents, key)).filter((i) => i !== -1),
  );
  if (selected.size === 0) selected.add(focus);
  const anchorIndex = indexOfKey(contents, keys.anchor);
  return {
    selected,
    focus,
    anchor: anchorIndex !== -1 ? anchorIndex : focus,
  };
}
