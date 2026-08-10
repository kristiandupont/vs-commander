/** @jsxImportSource @b9g/crank */

import { renderer } from "@b9g/crank/dom";
import type { Context } from "@b9g/crank";

import { DirectoryItem, WorkspaceFolder } from "./types";
import { vscode } from "./webviewApi";
import { getParentUri } from "./getParentUri";
import { Pane } from "./Pane";
import { QuickView, QuickViewState } from "./QuickView";

// Lazy-loaded renderers chunk — only downloaded on first Space press
let renderersPromise: Promise<typeof import("./renderers")> | null = null;
const getRenderers = () => {
  if (!renderersPromise) renderersPromise = import("./renderers");
  return renderersPromise;
};

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
  let quickView: QuickViewState | null = null;

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

  // Copy and move both send the selection of the active pane to the directory
  // the opposite pane is showing
  const triggerTransfer = (command: "copyFiles" | "moveFiles") => {
    const selected =
      activePane === "left" ? leftSelectedIndices : rightSelectedIndices;
    const otherPane = activePane === "left" ? "right" : "left";
    const targetUri = activePane === "left" ? rightUri : leftUri;
    const contents = activePane === "left" ? leftContents : rightContents;
    const uris = [...selected]
      .filter((i) => i > 0)
      .map((i) => contents[i - 1]?.uri)
      .filter(Boolean) as string[];
    if (uris.length > 0 && targetUri) {
      vscode.postMessage({
        command,
        uris,
        targetDirectoryUri: targetUri,
        pane: activePane,
      });
      // Reload destination immediately so the round-trip overlaps with the write
      loadDirectory(targetUri, otherPane);
    }
  };

  const triggerCopy = () => triggerTransfer("copyFiles");
  const triggerMove = () => triggerTransfer("moveFiles");

  const openQuickView = (item: DirectoryItem) => {
    this.refresh(() => {
      quickView = { status: "loading", fileName: item.name };
    });
    vscode.postMessage({
      command: "previewFile",
      uri: item.uri,
      isDirectory: item.type === "directory",
    });
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

          if (quickView !== null) {
            const item = newFocusIndex > 0 ? contents[newFocusIndex - 1] : null;
            if (item) {
              openQuickView(item);
            } else {
              this.refresh(() => { quickView = null; });
            }
          }
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
      case "F2": {
        e.preventDefault();
        const selected =
          activePane === "left" ? leftSelectedIndices : rightSelectedIndices;
        if (selected.size === 1 && !selected.has(0)) {
          const idx = [...selected][0];
          const item = contents[idx - 1];
          if (item) {
            vscode.postMessage({
              command: "renameFile",
              uri: item.uri,
              pane: activePane,
            });
          }
        }
        break;
      }
      case "Delete": {
        e.preventDefault();
        const selected =
          activePane === "left" ? leftSelectedIndices : rightSelectedIndices;
        const uris = [...selected]
          .filter((i) => i > 0)
          .map((i) => contents[i - 1]?.uri)
          .filter(Boolean) as string[];
        if (uris.length > 0) {
          vscode.postMessage({
            command: "deleteFiles",
            uris,
            pane: activePane,
          });
        }
        break;
      }
      case "F5": {
        e.preventDefault();
        triggerCopy();
        break;
      }
      case "F6": {
        e.preventDefault();
        triggerMove();
        break;
      }
      case "F7": {
        e.preventDefault();
        const currentUri = activePane === "left" ? leftUri : rightUri;
        if (currentUri) {
          vscode.postMessage({
            command: "mkdir",
            currentDirectoryUri: currentUri,
            pane: activePane,
          });
        }
        break;
      }
      case " ": {
        e.preventDefault();
        if (quickView !== null) {
          this.refresh(() => { quickView = null; });
          break;
        }
        const selected =
          activePane === "left" ? leftSelectedIndices : rightSelectedIndices;
        if (selected.size !== 1 || selected.has(0)) break;
        const idx = [...selected][0];
        const item = contents[idx - 1];
        if (!item) break;
        openQuickView(item);
        break;
      }
      case "Escape": {
        if (quickView !== null) {
          e.preventDefault();
          this.refresh(() => { quickView = null; });
        }
        break;
      }
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
      case "triggerCopy": {
        triggerCopy();
        break;
      }
      case "triggerMove": {
        triggerMove();
        break;
      }
      case "triggerMkdir": {
        const currentUri = activePane === "left" ? leftUri : rightUri;
        if (currentUri) {
          vscode.postMessage({
            command: "mkdir",
            currentDirectoryUri: currentUri,
            pane: activePane,
          });
        }
        break;
      }
      case "filePreview": {
        const { type, content, src, extension: ext, fileName, summary } = message;
        if (type === "binary") {
          this.refresh(() => { quickView = { status: "binary", fileName }; });
          break;
        }
        if (type === "directory") {
          // Scanning takes a moment, so a fast arrow-key run can outpace it
          if (quickView?.fileName !== fileName) break;
          this.refresh(() => {
            quickView = { status: "directory", fileName, summary };
          });
          break;
        }
        if (type === "image") {
          this.refresh(() => { quickView = { status: "image", src, fileName }; });
          break;
        }
        // text: lazy-load renderers then render
        getRenderers().then((r) => {
          const html =
            type === "markdown"
              ? r.renderMarkdown(content)
              : r.renderCode(content, ext || "");
          this.refresh(() => {
            if (quickView !== null && quickView.status === "loading") {
              quickView = {
                status: "html",
                html,
                fileName,
                isCode: type !== "markdown",
              };
            }
          });
        });
        break;
      }
      case "operationComplete": {
        const pane = message.pane as "left" | "right";
        const uri = pane === "left" ? leftUri : rightUri;
        if (uri) loadDirectory(uri, pane);
        if (message.reloadOtherPane) {
          const otherPane = pane === "left" ? "right" : "left";
          const otherUri = otherPane === "left" ? leftUri : rightUri;
          if (otherUri) loadDirectory(otherUri, otherPane);
        }
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
    this.after(() => {
      const focusedEl = document.querySelector(
        `#${activePane}-content .item.focused`,
      );
      focusedEl?.scrollIntoView({ block: "nearest" });
    });
    yield (
      <div class="commander">
        {quickView && (
          <QuickView
            state={quickView}
            onClose={() => this.refresh(() => { quickView = null; })}
          />
        )}
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
