// Type definitions for the VS Commander webview

declare global {
  const acquireVsCodeApi: () => any;
  const vscode: any; // Acquired in main.ts
}

export interface DirectoryItem {
  name: string;
  type: "directory" | "file";
  uri: string;
}

export interface WorkspaceFolder {
  name: string;
  uri: string;
}
