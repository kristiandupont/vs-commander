# src

Two sides that only talk over `postMessage`:

- `extension.ts` — the extension host. Registers the custom editor (`vsCommander.editor`, bound to `untitled:VS Commander?<timestamp>` documents — the timestamp is in the query so the tab label stays clean), owns all filesystem access via `vscode.workspace.fs`, and forwards the `vsCommander.*` commands to the active panel's webview. All UI prompts (rename, confirm delete, new folder name) live here, since only the host can show VS Code input boxes.
- `webview/` — the Crank UI. See its own AGENTS.md.

Keybindings live in `package.json`, but the webview has focus in practice, so most keys are handled by the webview's own `keydown` listener; the registered commands are the fallback path.

Build: `npm run build` runs `tsc` twice (host → `out/`, webview → `out/webview/`), then esbuild bundles the webview into `media/` and copies `main.css` there. `media/` is the shipped output — never edit it by hand.
