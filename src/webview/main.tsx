/** @jsxImportSource @b9g/crank */

import { renderer } from "@b9g/crank/dom";
import type { Context } from "@b9g/crank";

import { DirectoryItem, WorkspaceFolder } from "./types";
import { vscode } from "./webviewApi";
import { getParentUri } from "./getParentUri";
import { Pane } from "./Pane";

function sortContents(contents: DirectoryItem[]): DirectoryItem[] {
  return [...contents].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
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
  let leftAnchorIndex = 0;
  let rightAnchorIndex = 0;

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
    leftAnchorIndex = savedState.leftAnchorIndex || 0;
    rightAnchorIndex = savedState.rightAnchorIndex || 0;
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
      leftAnchorIndex,
      rightAnchorIndex,
    });
  };

  const loadDirectory = (uri: string, pane: "left" | "right") => {
    vscode.postMessage({ command: "getDirectoryContents", uri, pane });
  };

  const navigateTo = (uri: string, pane: "left" | "right") => {
    this.refresh(() => {
      if (pane === "left") {
        leftUri = uri;
        leftFocusIndex = 0;
        leftAnchorIndex = 0;
        leftSelectedIndices = new Set([0]);
      } else {
        rightUri = uri;
        rightFocusIndex = 0;
        rightAnchorIndex = 0;
        rightSelectedIndices = new Set([0]);
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
      const anchor = pane === "left" ? leftAnchorIndex : rightAnchorIndex;

      if (shiftKey) {
        selectedIndices.clear();
        const start = Math.min(anchor, index);
        const end = Math.max(anchor, index);
        for (let i = start; i <= end; i++) {
          selectedIndices.add(i);
        }
        if (pane === "left") {
          leftFocusIndex = index;
        } else {
          rightFocusIndex = index;
        }
      } else {
        selectedIndices.clear();
        selectedIndices.add(index);
        if (pane === "left") {
          leftFocusIndex = index;
          leftAnchorIndex = index;
        } else {
          rightFocusIndex = index;
          rightAnchorIndex = index;
        }
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
              activePane === "left"
                ? leftSelectedIndices
                : rightSelectedIndices;
            const anchor =
              activePane === "left" ? leftAnchorIndex : rightAnchorIndex;

            if (e.shiftKey) {
              selectedIndices.clear();
              const start = Math.min(anchor, newFocusIndex);
              const end = Math.max(anchor, newFocusIndex);
              for (let i = start; i <= end; i++) {
                selectedIndices.add(i);
              }
              if (activePane === "left") {
                leftFocusIndex = newFocusIndex;
              } else {
                rightFocusIndex = newFocusIndex;
              }
            } else {
              selectedIndices.clear();
              selectedIndices.add(newFocusIndex);
              if (activePane === "left") {
                leftFocusIndex = newFocusIndex;
                leftAnchorIndex = newFocusIndex;
              } else {
                rightFocusIndex = newFocusIndex;
                rightAnchorIndex = newFocusIndex;
              }
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
          const sorted = sortContents(message.contents);
          if (message.pane === "left") {
            leftContents = sorted;
          } else {
            rightContents = sorted;
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
