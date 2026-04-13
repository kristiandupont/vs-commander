// Type definitions for the VS Commander webview

export interface DirectoryItem {
  name: string;
  type: "directory" | "file";
  uri: string;
  size?: number;
  lastModified?: number;
}

export interface WorkspaceFolder {
  name: string;
  uri: string;
}
