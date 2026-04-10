// Main entry point for the VS Commander webview

import "./types"; // Declare globals
import { getHasSavedState, leftCurrentUri, rightCurrentUri } from "./state";
import {
  setElements as setUIElements,
  loadDirectory,
  displayDirectoryContents,
} from "./ui";
import {
  setElements as setHandlerElements,
  initializePanes,
  handleKeyboard,
  handlePathInput,
} from "./handlers";

import { vscode } from "./webviewApi";

// Elements
const leftPathInput = document.getElementById("left-path") as HTMLInputElement;
const rightPathInput = document.getElementById(
  "right-path",
) as HTMLInputElement;
const leftContent = document.getElementById("left-content") as HTMLElement;
const rightContent = document.getElementById("right-content") as HTMLElement;

// Set elements in modules
setUIElements(leftPathInput, rightPathInput, leftContent, rightContent);
setHandlerElements(leftPathInput, rightPathInput, leftContent, rightContent);

// Initialize
window.addEventListener("load", () => {
  if (!getHasSavedState()) {
    vscode.postMessage({ command: "getWorkspaceFolders" });
  } else {
    if (leftCurrentUri) {
      leftPathInput.value = leftCurrentUri;
      loadDirectory(leftCurrentUri, "left");
    }
    if (rightCurrentUri) {
      rightPathInput.value = rightCurrentUri;
      loadDirectory(rightCurrentUri, "right");
    }
  }
});

// Handle messages from extension
window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.command) {
    case "workspaceFolders":
      initializePanes(message.folders);
      break;
    case "directoryContents":
      displayDirectoryContents(message.contents, message.pane);
      break;
  }
});

// Keyboard navigation
document.addEventListener("keydown", handleKeyboard);

// Path input handlers
leftPathInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handlePathInput("left");
  }
});

rightPathInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handlePathInput("right");
  }
});
