# src/webview

Crank (not React — see `docs/crank-reference-for-react-devs.md`) UI for the dual-pane browser.

- `main.tsx` — the `App` generator: owns all state for both panes, the keyboard handler, and the message handler. Rendered into `#crank-root`.
- `Pane.tsx` — one pane: path bar, column headers, rows.
- `QuickView.tsx` — the Space-key overlay (file preview or folder summary).
- `renderers.ts` — marked + highlight.js. Imported dynamically so the ~200 kB chunk is only fetched on first Quick View.
- `displayPath.ts` / `getParentUri.ts` / `formatBytes.ts` / `types.ts` — small shared helpers.
- `main.css` — styles for the whole webview.

## Things that bite

- **Row indices are offset by one**: index 0 is the ".." row, so `contents[i - 1]` is the item at index `i`. Selection sets and focus indices all use the offset numbering.
- **Panes are flex items**; they need `min-width: 0` or long filenames widen a pane instead of ellipsizing.
- Pane state is persisted through `vscode.getState()`/`setState()` on every change, so a tab survives being backgrounded.
- The host never pushes updates on its own: after a write it replies `operationComplete` (optionally `reloadOtherPane`) and the webview re-requests the directory listing.

## Messages

To the host: `getWorkspaceFolders`, `getDirectoryContents`, `openFile`, `previewFile` (`isDirectory` picks file preview vs. folder scan), `renameFile`, `deleteFiles`, `mkdir`, `copyFiles`, `moveFiles`.

From the host: `workspaceFolders`, `directoryContents`, `filePreview` (`type`: `code` | `markdown` | `image` | `binary` | `directory`), `operationComplete`, and the command relays `triggerCopy` / `triggerMove` / `triggerMkdir`.
