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
          ..
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
              {item.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
