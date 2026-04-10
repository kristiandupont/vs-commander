// UI management for the VS Commander webview

import { DirectoryItem } from "./types";
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
} from "./state";
import { handleItemClick } from "./handlers";
import { vscode } from "./webviewApi";

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

export function loadDirectory(uri: string, pane: "left" | "right") {
  vscode.postMessage({ command: "getDirectoryContents", uri, pane });
}

export function displayDirectoryContents(
  contents: DirectoryItem[],
  pane: "left" | "right",
) {
  const container = pane === "left" ? leftContent : rightContent;
  const selectedIndices =
    pane === "left" ? leftSelectedIndices : rightSelectedIndices;
  const focusIndex = pane === "left" ? leftFocusIndex : rightFocusIndex;

  container.innerHTML = "";

  // Add parent directory item ("..")
  const parentItem = document.createElement("div");
  parentItem.className = "item directory parent";
  parentItem.textContent = "..";
  parentItem.dataset.index = "0";
  parentItem.addEventListener("click", () => {
    const currentUri = pane === "left" ? leftCurrentUri : rightCurrentUri;
    const pathInput = pane === "left" ? leftPathInput : rightPathInput;
    const parentUri = getParentUri(currentUri);
    if (parentUri) {
      pathInput.value = parentUri;
      if (pane === "left") {
        setLeftCurrentUri(parentUri);
      } else {
        setRightCurrentUri(parentUri);
      }
      loadDirectory(parentUri, pane);
      saveState();
    }
  });
  if (selectedIndices.has(0)) {
    parentItem.classList.add("selected");
  }
  if (activePane === pane && focusIndex === 0) {
    parentItem.classList.add("focused");
  }
  container.appendChild(parentItem);

  // Add directory contents
  contents.forEach((item, index) => {
    const actualIndex = index + 1;
    const div = document.createElement("div");
    div.className = `item ${item.type}`;
    div.textContent = item.name;
    div.dataset.index = actualIndex.toString();
    div.dataset.uri = item.uri;

    div.addEventListener("click", (event) => {
      handleItemClick(event, actualIndex, pane);
    });

    if (selectedIndices.has(actualIndex)) {
      div.classList.add("selected");
    }
    if (activePane === pane && focusIndex === actualIndex) {
      div.classList.add("focused");
    }

    container.appendChild(div);
  });
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

export function updateDisplay() {
  if (leftCurrentUri) {
    loadDirectory(leftCurrentUri, "left");
  }
  if (rightCurrentUri) {
    loadDirectory(rightCurrentUri, "right");
  }
}
