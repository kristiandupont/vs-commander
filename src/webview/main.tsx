/** @jsxImportSource @b9g/crank */

import { renderer } from "@b9g/crank/dom";
import type { Context } from "@b9g/crank";

import "./types";
import { DirectoryItem, WorkspaceFolder } from "./types";
import { vscode } from "./webviewApi";

function getParentUri(uri: string): string | null {
  try {
    const url = new URL(uri);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    parts.pop();
    url.pathname = "/" + parts.join("/");
    return url.toString();
  } catch {
    return null;
  }
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

function Pane({
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

function* App(this: Context) {
  let leftUri = "";
  let rightUri = "";
  let leftContents: DirectoryItem[] = [];
  let rightContents: DirectoryItem[] = [];
  let activePane: "left" | "right" = "left";
  let leftSelectedIndices = new Set<number>([0]);
  let rightSelectedIndices = new Set<number>([0]);
  let leftFocusIndex = 0;
  let rightFocusIndex = 0;

  // Restore persisted state
  const savedState = vscode.getState();
  const hasSavedState =
    savedState && (savedState.leftUri || savedState.rightUri);
  if (hasSavedState) {
    leftUri = savedState.leftUri || "";
    rightUri = savedState.rightUri || "";
    activePane = savedState.activePane || "left";
    leftSelectedIndices = new Set(savedState.leftSelectedIndices || [0]);
    rightSelectedIndices = new Set(savedState.rightSelectedIndices || [0]);
    leftFocusIndex = savedState.leftFocusIndex || 0;
    rightFocusIndex = savedState.rightFocusIndex || 0;
  }

  const saveState = () => {
    vscode.setState({
      leftUri,
      rightUri,
      activePane,
      leftSelectedIndices: Array.from(leftSelectedIndices),
      rightSelectedIndices: Array.from(rightSelectedIndices),
      leftFocusIndex,
      rightFocusIndex,
    });
  };

  const loadDirectory = (uri: string, pane: "left" | "right") => {
    vscode.postMessage({ command: "getDirectoryContents", uri, pane });
  };

  const navigateTo = (uri: string, pane: "left" | "right") => {
    this.refresh(() => {
      if (pane === "left") {
        leftUri = uri;
      } else {
        rightUri = uri;
      }
    });
    loadDirectory(uri, pane);
    saveState();
  };

  const handleItemSelect = (
    index: number,
    shiftKey: boolean,
    pane: "left" | "right",
  ) => {
    this.refresh(() => {
      activePane = pane;
      const selectedIndices =
        pane === "left" ? leftSelectedIndices : rightSelectedIndices;
      const currentFocus =
        pane === "left" ? leftFocusIndex : rightFocusIndex;

      if (shiftKey) {
        selectedIndices.clear();
        const start = Math.min(currentFocus, index);
        const end = Math.max(currentFocus, index);
        for (let i = start; i <= end; i++) {
          selectedIndices.add(i);
        }
      } else {
        selectedIndices.clear();
        selectedIndices.add(index);
      }

      if (pane === "left") {
        leftFocusIndex = index;
      } else {
        rightFocusIndex = index;
      }
    });
    saveState();
  };

  const handleEnterKey = () => {
    const focusIndex = activePane === "left" ? leftFocusIndex : rightFocusIndex;
    const currentUri = activePane === "left" ? leftUri : rightUri;
    const contents = activePane === "left" ? leftContents : rightContents;

    if (focusIndex === 0) {
      const parentUri = getParentUri(currentUri);
      if (parentUri) {
        navigateTo(parentUri, activePane);
      }
      return;
    }

    const item = contents[focusIndex - 1]; // offset by 1 because index 0 is ".."
    if (!item) return;

    if (item.type === "directory") {
      navigateTo(item.uri, activePane);
    } else {
      vscode.postMessage({ command: "openFile", uri: item.uri });
    }
  };

  const handleKeyboard = (e: KeyboardEvent) => {
    // Don't intercept when the user is typing in a path input
    if ((e.target as HTMLElement).tagName === "INPUT") return;

    const focusIndex = activePane === "left" ? leftFocusIndex : rightFocusIndex;
    const contents = activePane === "left" ? leftContents : rightContents;
    const itemCount = contents.length + 1; // +1 for ".."

    if (itemCount === 0) return;

    switch (e.key) {
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        const newFocusIndex =
          e.key === "ArrowUp"
            ? Math.max(0, focusIndex - 1)
            : Math.min(itemCount - 1, focusIndex + 1);

        if (newFocusIndex !== focusIndex) {
          this.refresh(() => {
            const selectedIndices =
              activePane === "left" ? leftSelectedIndices : rightSelectedIndices;

            if (e.shiftKey) {
              selectedIndices.clear();
              const start = Math.min(focusIndex, newFocusIndex);
              const end = Math.max(focusIndex, newFocusIndex);
              for (let i = start; i <= end; i++) {
                selectedIndices.add(i);
              }
            } else {
              selectedIndices.clear();
              selectedIndices.add(newFocusIndex);
            }

            if (activePane === "left") {
              leftFocusIndex = newFocusIndex;
            } else {
              rightFocusIndex = newFocusIndex;
            }
          });
          saveState();
        }
        break;
      }
      case "Enter":
        e.preventDefault();
        handleEnterKey();
        break;
      case "Tab":
        e.preventDefault();
        this.refresh(() => {
          activePane = activePane === "left" ? "right" : "left";
        });
        saveState();
        break;
    }
  };

  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    switch (message.command) {
      case "workspaceFolders": {
        const folders: WorkspaceFolder[] = message.folders;
        if (folders && folders.length > 0) {
          this.refresh(() => {
            leftUri = folders[0].uri;
            rightUri = folders.length > 1 ? folders[1].uri : folders[0].uri;
          });
          loadDirectory(leftUri, "left");
          loadDirectory(rightUri, "right");
          saveState();
        }
        break;
      }
      case "directoryContents": {
        this.refresh(() => {
          if (message.pane === "left") {
            leftContents = message.contents;
          } else {
            rightContents = message.contents;
          }
        });
        break;
      }
    }
  };

  window.addEventListener("message", handleMessage);
  document.addEventListener("keydown", handleKeyboard);
  this.cleanup(() => {
    window.removeEventListener("message", handleMessage);
    document.removeEventListener("keydown", handleKeyboard);
  });

  if (!hasSavedState) {
    vscode.postMessage({ command: "getWorkspaceFolders" });
  } else {
    if (leftUri) loadDirectory(leftUri, "left");
    if (rightUri) loadDirectory(rightUri, "right");
  }

  for ({} of this) {
    yield (
      <div class="commander">
        <Pane
          pane="left"
          uri={leftUri}
          contents={leftContents}
          selectedIndices={leftSelectedIndices}
          focusIndex={leftFocusIndex}
          isActive={activePane === "left"}
          onNavigate={(uri) => navigateTo(uri, "left")}
          onItemSelect={(index, shiftKey) =>
            handleItemSelect(index, shiftKey, "left")
          }
        />
        <Pane
          pane="right"
          uri={rightUri}
          contents={rightContents}
          selectedIndices={rightSelectedIndices}
          focusIndex={rightFocusIndex}
          isActive={activePane === "right"}
          onNavigate={(uri) => navigateTo(uri, "right")}
          onItemSelect={(index, shiftKey) =>
            handleItemSelect(index, shiftKey, "right")
          }
        />
      </div>
    );
  }
}

renderer.render(<App />, document.getElementById("crank-root")!);
