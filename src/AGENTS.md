# src

Two sides that only talk over `postMessage`:

- `extension.ts` — the extension host. Registers the custom editor (`vsCommander.editor`, bound to `untitled:VS Commander?<timestamp>` documents — the timestamp is in the query so the tab label stays clean), owns all filesystem access via `vscode.workspace.fs` (except reading symlink targets, which uses Node `fs` and so only works for `file:` URIs), and forwards the `vsCommander.*` commands to the active panel's webview. All UI prompts (rename, confirm delete, new folder name) live here, since only the host can show VS Code input boxes.
- `webview/` — the Crank UI. See its own AGENTS.md.

Most keys are handled by the webview's own `keydown` listener. F5/F6/F7 and `Ctrl+\` (toggle panes) are the exception: VS Code also runs its keybindings for keys pressed inside the webview (F5 would otherwise start debugging), so they are handled only by the `package.json` keybindings → `vsCommander.*` commands → `trigger*` messages. Handling them in the webview too runs each operation twice.

Build: `npm run build` runs `tsc` twice (host → `out/`, webview → `out/webview/`), then esbuild bundles the webview into `media/` and copies `main.css` there. `media/` is the shipped output — never edit it by hand.
