/** @jsxImportSource @b9g/crank */

import { getParentUri } from "./getParentUri";
import { DirectoryItem } from "./types";

interface PaneProps {
  pane: "left" | "right";
  uri: string;
  contents: DirectoryItem[];
  selectedIndices: Set<number>;
  focusIndex: number;
  isActive: boolean;
  onNavigate: (uri: string) => void;
  onItemSelect: (index: number, shiftKey: boolean) => void;
}

function formatSize(item: DirectoryItem): string {
  if (item.type === "directory") return "<DIR>";
  if (item.size === undefined) return "";
  const size = item.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(ms?: number): string {
  if (ms === undefined) return "";
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function Pane({
  pane,
  uri,
  contents,
  selectedIndices,
  focusIndex,
  isActive,
  onNavigate,
  onItemSelect,
}: PaneProps) {
  const parentUri = getParentUri(uri);

  return (
    <div class={{ pane: true, active: isActive }} id={`${pane}-pane`}>
      <div class="pane-header">
        <input
          type="text"
          id={`${pane}-path`}
          placeholder="Path"
          value={uri}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter") {
              onNavigate((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>
      <div class="pane-columns">
        <span class="col-name">Name</span>
        <span class="col-size">Size</span>
        <span class="col-date">Modified</span>
      </div>
      <div class="pane-content" id={`${pane}-content`}>
        <div
          class={{
            item: true,
            directory: true,
            parent: true,
            selected: selectedIndices.has(0),
            focused: isActive && focusIndex === 0,
          }}
          onclick={() => parentUri && onNavigate(parentUri)}
        >
          <span class="col-name">..</span>
          <span class="col-size" />
          <span class="col-date" />
        </div>
        {contents.map((item, index) => {
          const actualIndex = index + 1;
          return (
            <div
              key={item.uri}
              class={{
                item: true,
                [item.type]: true,
                selected: selectedIndices.has(actualIndex),
                focused: isActive && focusIndex === actualIndex,
              }}
              data-uri={item.uri}
              onclick={(e: MouseEvent) => onItemSelect(actualIndex, e.shiftKey)}
            >
              <span class="col-name">{item.name}</span>
              <span class="col-size">{formatSize(item)}</span>
              <span class="col-date">{formatDate(item.lastModified)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
