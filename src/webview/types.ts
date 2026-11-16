// Type definitions for the VS Commander webview

export interface DirectoryItem {
  name: string;
  type: "directory" | "file";
  uri: string;
  // Symlinked directories have type "directory"; a broken link has type "file"
  isSymlink: boolean;
  size?: number;
  lastModified?: number;
}

/** Where a symbolic link points. `target` is the link text as stored, so it can
 * be relative to the link's folder. Only available for `file:` URIs. */
export interface SymlinkInfo {
  target: string;
  broken: boolean;
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
