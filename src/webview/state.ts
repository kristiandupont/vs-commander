// State management for the VS Commander webview

export let leftCurrentUri = "";
export let rightCurrentUri = "";
export let activePane: "left" | "right" = "left";
export let leftSelectedIndices = new Set<number>([0]);
export let rightSelectedIndices = new Set<number>([0]);
export let leftFocusIndex = 0;
export let rightFocusIndex = 0;

import { vscode } from "./webviewApi";

// Load saved state
const savedState = vscode.getState();
const hasSavedState =
  savedState && (savedState.leftCurrentUri || savedState.rightCurrentUri);
if (hasSavedState) {
  leftCurrentUri = savedState.leftCurrentUri || "";
  rightCurrentUri = savedState.rightCurrentUri || "";
  activePane = savedState.activePane || "left";
  leftSelectedIndices = new Set(savedState.leftSelectedIndices || [0]);
  rightSelectedIndices = new Set(savedState.rightSelectedIndices || [0]);
  leftFocusIndex = savedState.leftFocusIndex || 0;
  rightFocusIndex = savedState.rightFocusIndex || 0;
}

export const getHasSavedState = () => hasSavedState;

// Save state function
export function saveState() {
  vscode.setState({
    leftCurrentUri,
    rightCurrentUri,
    activePane,
    leftSelectedIndices: Array.from(leftSelectedIndices),
    rightSelectedIndices: Array.from(rightSelectedIndices),
    leftFocusIndex,
    rightFocusIndex,
  });
}

// Setters
export function setLeftCurrentUri(uri: string) {
  leftCurrentUri = uri;
}

export function setRightCurrentUri(uri: string) {
  rightCurrentUri = uri;
}

export function setActivePane(pane: "left" | "right") {
  activePane = pane;
}

export function setLeftFocusIndex(index: number) {
  leftFocusIndex = index;
}

export function setRightFocusIndex(index: number) {
  rightFocusIndex = index;
}

// Note: vscode is acquired in main.ts
