/** @jsxImportSource @b9g/crank */

import { getParentUri } from "./getParentUri";
import { displayPathToUri, uriToDisplayPath } from "./displayPath";
import { formatBytes } from "./formatBytes";
import { DirectoryItem } from "./types";

function formatSize(item: DirectoryItem): string {
  if (item.type === "directory") return "<DIR>";
  if (item.size === undefined) return "";
  return formatBytes(item.size);
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
  const displayPath = uriToDisplayPath(uri);

  return (
    <div class={{ pane: true, active: isActive }} id={`${pane}-pane`}>
      <div class="pane-header">
        <input
          type="text"
          id={`${pane}-path`}
          placeholder="Path"
          value={displayPath}
          title={displayPath}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter") {
              const target = displayPathToUri(
                (e.target as HTMLInputElement).value,
                uri,
              );
              if (target) onNavigate(target);
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
          const isFocused = isActive && focusIndex === actualIndex;
          return (
            <div
              key={item.uri}
              class={{
                item: true,
                [item.type]: true,
                selected: selectedIndices.has(actualIndex),
                focused: isFocused,
              }}
              title={item.name}
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
