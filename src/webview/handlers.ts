// Event handlers for the VS Commander webview

import { DirectoryItem, WorkspaceFolder } from "./types";
import {
  leftCurrentUri,
  rightCurrentUri,
  activePane,
  leftSelectedIndices,
  rightSelectedIndices,
  leftFocusIndex,
  rightFocusIndex,
  saveState,
  setLeftCurrentUri,
  setRightCurrentUri,
  setActivePane,
  setLeftFocusIndex,
  setRightFocusIndex,
} from "./state";
import { displayDirectoryContents, loadDirectory, updateDisplay } from "./ui";

// Elements (will be set in main.ts)
let leftPathInput: HTMLInputElement;
let rightPathInput: HTMLInputElement;
let leftContent: HTMLElement;
let rightContent: HTMLElement;

export function setElements(
  leftPath: HTMLInputElement,
  rightPath: HTMLInputElement,
  leftCont: HTMLElement,
  rightCont: HTMLElement,
) {
  leftPathInput = leftPath;
  rightPathInput = rightPath;
  leftContent = leftCont;
  rightContent = rightCont;
}

export function initializePanes(folders: WorkspaceFolder[]) {
  if (folders && folders.length > 0) {
    setLeftCurrentUri(folders[0].uri);
    leftPathInput.value = folders[0].uri;
    loadDirectory(leftCurrentUri, "left");

    if (folders.length > 1) {
      setRightCurrentUri(folders[1].uri);
      rightPathInput.value = folders[1].uri;
      loadDirectory(rightCurrentUri, "right");
    } else {
      setRightCurrentUri(folders[0].uri);
      rightPathInput.value = folders[0].uri;
      loadDirectory(rightCurrentUri, "right");
    }
  }
  saveState();
}

export function handleItemClick(
  event: MouseEvent,
  index: number,
  pane: "left" | "right",
) {
  if (activePane !== pane) {
    setActivePane(pane);
    updatePaneFocus();
  }

  const selectedIndices =
    pane === "left" ? leftSelectedIndices : rightSelectedIndices;
  const currentFocus = pane === "left" ? leftFocusIndex : rightFocusIndex;

  if (event.shiftKey) {
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
    setLeftFocusIndex(index);
  } else {
    setRightFocusIndex(index);
  }

  updateDisplay();
  saveState();
}

export function handleEnterKey() {
  const focusIndex = activePane === "left" ? leftFocusIndex : rightFocusIndex;
  const currentUri = activePane === "left" ? leftCurrentUri : rightCurrentUri;
  const pathInput = activePane === "left" ? leftPathInput : rightPathInput;

  if (focusIndex === 0) {
    const parentUri = getParentUri(currentUri);
    if (parentUri) {
      pathInput.value = parentUri;
      if (activePane === "left") {
        setLeftCurrentUri(parentUri);
      } else {
        setRightCurrentUri(parentUri);
      }
      loadDirectory(parentUri, activePane);
      saveState();
    }
    return;
  }

  const container = activePane === "left" ? leftContent : rightContent;
  const item = container.children[focusIndex] as HTMLElement;
  if (item && item.classList.contains("directory")) {
    const uri = item.dataset.uri!;
    pathInput.value = uri;
    if (activePane === "left") {
      setLeftCurrentUri(uri);
    } else {
      setRightCurrentUri(uri);
    }
    loadDirectory(uri, activePane);
    saveState();
  } else if (item) {
    const uri = item.dataset.uri!;
    vscode.postMessage({ command: "openFile", uri });
  }
}

function getParentUri(uri: string): string | null {
  const parsedUri = vscode.Uri.parse(uri);
  const pathParts = parsedUri.path.split("/");
  if (pathParts.length > 1) {
    pathParts.pop();
    const parentPath = pathParts.join("/") || "/";
    return parsedUri.with({ path: parentPath }).toString();
  }
  return null;
}

export function handleKeyboard(e: KeyboardEvent) {
  const selectedIndices =
    activePane === "left" ? leftSelectedIndices : rightSelectedIndices;
  const focusIndex = activePane === "left" ? leftFocusIndex : rightFocusIndex;
  const container = activePane === "left" ? leftContent : rightContent;
  const itemCount = container.children.length;

  if (itemCount === 0) return;

  let newFocusIndex = focusIndex;

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      newFocusIndex = Math.max(0, focusIndex - 1);
      break;
    case "ArrowDown":
      e.preventDefault();
      newFocusIndex = Math.min(itemCount - 1, focusIndex + 1);
      break;
    case "Enter":
      e.preventDefault();
      handleEnterKey();
      return;
    case "Tab":
      e.preventDefault();
      setActivePane(activePane === "left" ? "right" : "left");
      updatePaneFocus();
      saveState();
      return;
  }

  if (newFocusIndex !== focusIndex) {
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
      setLeftFocusIndex(newFocusIndex);
    } else {
      setRightFocusIndex(newFocusIndex);
    }

    updateDisplay();
    saveState();
  }
}

export function updatePaneFocus() {
  updateDisplay();
}

export function handlePathInput(pane: "left" | "right") {
  const pathInput = pane === "left" ? leftPathInput : rightPathInput;
  const uri = pathInput.value;
  if (pane === "left") {
    setLeftCurrentUri(uri);
  } else {
    setRightCurrentUri(uri);
  }
  loadDirectory(uri, pane);
  saveState();
}
