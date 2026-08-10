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

/** Recursive tally of a folder's contents. `truncated` means the extension host
 * hit its scan budget, so the numbers are lower bounds. */
export interface DirectorySummary {
  files: number;
  folders: number;
  totalSize: number;
  truncated: boolean;
}
