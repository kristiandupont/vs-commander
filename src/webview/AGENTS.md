# src/webview

Crank (not React — see `docs/crank-reference-for-react-devs.md`) UI for the dual-pane browser.

- `main.tsx` — the `App` generator: owns all state for both panes, the keyboard handler, and the message handler. Rendered into `#crank-root`.
- `Pane.tsx` — one pane: path bar, column headers, rows.
- `QuickView.tsx` — the Space-key overlay (file preview or folder summary).
- `paneSelection.ts` — converts a pane's selection between row indices and URIs (see below).
- `renderers.ts` — marked + highlight.js. Imported dynamically so the ~200 kB chunk is only fetched on first Quick View.
- `displayPath.ts` / `getParentUri.ts` / `formatBytes.ts` / `types.ts` — small shared helpers.
- `main.css` — styles for the whole webview.

## Things that bite

- **Row indices are offset by one**: index 0 is the ".." row, so `contents[i - 1]` is the item at index `i`. Selection sets and focus indices all use the offset numbering.
- **Indices only hold for one listing.** When a `directoryContents` reply arrives, the selection is converted to URIs against the old contents and back to indices against the new ones (`paneSelection.ts`); a vanished focus row keeps its position, clamped. A pane's pending selection (restored state, or `operationComplete.focusUri` from rename/mkdir) is applied instead when set. Persisted state stores the selection as URIs.
- **Panes are flex items**; they need `min-width: 0` or long filenames widen a pane instead of ellipsizing.
- **Single-pane mode** (`singlePane`) renders only the active pane; Tab swaps which one is shown, and F5/F6 still target the hidden pane's directory. It starts in single-pane mode when the webview is narrower than `MIN_TWO_PANE_WIDTH`, and the choice is persisted.
- Selection colours follow VS Code lists: `.pane.has-focus` (active pane *and* the webview window has focus) uses the active selection colours and outlines the cursor row; otherwise the inactive selection colours.
- Pane state is persisted through `vscode.getState()`/`setState()` on every change, so a tab survives being backgrounded.
- Replies can arrive out of order. `directoryContents` echoes `uri` and is dropped unless it matches the pane's current URI; `filePreview` echoes `requestId` and is dropped unless it matches `quickViewRequestId` and the overlay is still open.
- The host never pushes updates on its own: after a write it replies `operationComplete` (optionally `reloadOtherPane`) and the webview re-requests the directory listing.

## Messages

To the host: `getWorkspaceFolders`, `getDirectoryContents`, `openFile`, `previewFile` (`isDirectory` picks file preview vs. folder scan), `renameFile`, `deleteFiles`, `mkdir`, `copyFiles`, `moveFiles`.

From the host: `workspaceFolders`, `directoryContents`, `filePreview` (`type`: `code` | `markdown` | `image` | `binary` | `tooLarge` | `directory`), `operationComplete`, and the command relays `triggerCopy` / `triggerMove` / `triggerMkdir` / `triggerTogglePanes`.
