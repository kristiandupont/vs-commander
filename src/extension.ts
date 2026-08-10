import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("VS Commander is now active!");
  console.log("Debug mode");

  // Register the custom editor provider
  const provider = new VSCommanderEditorProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      VSCommanderEditorProvider.viewType,
      provider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vsCommander.copy", () => {
      provider.triggerCopyInActivePanel();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vsCommander.move", () => {
      provider.triggerMoveInActivePanel();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vsCommander.mkdir", () => {
      provider.triggerMkdirInActivePanel();
    }),
  );

  // Register command to create a new commander window
  let disposable = vscode.commands.registerCommand(
    "vsCommander.new",
    async () => {
      // The tab label is the basename of the document URI, so the session id
      // goes in the query: distinct URIs, but every tab reads "VS Commander"
      const uri = vscode.Uri.parse(`untitled:VS Commander?${Date.now()}`);
      await vscode.commands.executeCommand(
        "vscode.openWith",
        uri,
        VSCommanderEditorProvider.viewType,
      );
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

class VSCommanderEditorProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = "vsCommander.editor";

  private _activePanel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly _extensionUri: vscode.Uri, // eslint-disable-line no-unused-vars
    private readonly _context: vscode.ExtensionContext, // eslint-disable-line no-unused-vars
  ) {}

  triggerCopyInActivePanel() {
    this._activePanel?.webview.postMessage({ command: "triggerCopy" });
  }

  triggerMoveInActivePanel() {
    this._activePanel?.webview.postMessage({ command: "triggerMove" });
  }

  triggerMkdirInActivePanel() {
    this._activePanel?.webview.postMessage({ command: "triggerMkdir" });
  }

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext, // eslint-disable-line no-unused-vars
    _token: vscode.CancellationToken, // eslint-disable-line no-unused-vars
  ): Promise<vscode.CustomDocument> {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken, // eslint-disable-line no-unused-vars
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview);

    // Handle messages from the webview
    const messageHandler = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "getWorkspaceFolders": {
            const folders =
              vscode.workspace.workspaceFolders?.map((f) => ({
                name: f.name,
                uri: f.uri.toString(),
              })) || [];
            webviewPanel.webview.postMessage({
              command: "workspaceFolders",
              folders,
            });
            return;
          }
          case "getDirectoryContents": {
            const contents = await this.getDirectoryContents(
              vscode.Uri.parse(message.uri),
            );
            webviewPanel.webview.postMessage({
              command: "directoryContents",
              contents,
              pane: message.pane,
            });
            return;
          }
          case "openFile": {
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.parse(message.uri),
            );
            return;
          }
          case "renameFile": {
            const oldUri = vscode.Uri.parse(message.uri);
            const oldName = oldUri.path.split("/").pop() || "";
            const newName = await vscode.window.showInputBox({
              prompt: "Rename",
              value: oldName,
              validateInput: (value) => {
                if (!value || value.trim() === "") return "Name cannot be empty";
                if (value.includes("/") || value.includes("\\"))
                  return "Name cannot contain slashes";
                return null;
              },
            });
            if (newName && newName.trim() !== oldName) {
              const pathParts = oldUri.path.split("/");
              pathParts.pop();
              const parentUri = oldUri.with({ path: pathParts.join("/") || "/" });
              const newUri = vscode.Uri.joinPath(parentUri, newName.trim());
              try {
                await vscode.workspace.fs.rename(oldUri, newUri);
              } catch (err) {
                vscode.window.showErrorMessage(`Rename failed: ${err}`);
              }
            }
            webviewPanel.webview.postMessage({
              command: "operationComplete",
              pane: message.pane,
            });
            return;
          }
          case "deleteFiles": {
            const uris: string[] = message.uris;
            const count = uris.length;
            const label =
              count === 1
                ? vscode.Uri.parse(uris[0]).path.split("/").pop()
                : `${count} items`;
            const answer = await vscode.window.showWarningMessage(
              `Delete ${label}?`,
              { modal: true },
              "Delete",
            );
            if (answer === "Delete") {
              for (const uriStr of uris) {
                try {
                  await vscode.workspace.fs.delete(vscode.Uri.parse(uriStr), {
                    recursive: true,
                  });
                } catch (err) {
                  vscode.window.showErrorMessage(`Delete failed: ${err}`);
                }
              }
            }
            webviewPanel.webview.postMessage({
              command: "operationComplete",
              pane: message.pane,
            });
            return;
          }
          case "previewFile": {
            const fileUri = vscode.Uri.parse(message.uri);
            const fileName = fileUri.path.split("/").pop() || "";
            if (message.isDirectory) {
              webviewPanel.webview.postMessage({
                command: "filePreview",
                type: "directory",
                summary: await summarizeDirectory(fileUri),
                fileName,
              });
              return;
            }
            const ext = fileName.includes(".")
              ? fileName.split(".").pop()!.toLowerCase()
              : "";
            const IMAGE_EXTS = new Set([
              "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tiff",
            ]);
            let bytes: Uint8Array;
            try {
              bytes = await vscode.workspace.fs.readFile(fileUri);
            } catch {
              webviewPanel.webview.postMessage({
                command: "filePreview", type: "binary", fileName,
              });
              return;
            }
            if (IMAGE_EXTS.has(ext)) {
              const mimeMap: Record<string, string> = {
                jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
                gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
                bmp: "image/bmp", ico: "image/x-icon", tiff: "image/tiff",
              };
              const mime = mimeMap[ext] || `image/${ext}`;
              const base64 = Buffer.from(bytes).toString("base64");
              webviewPanel.webview.postMessage({
                command: "filePreview", type: "image",
                src: `data:${mime};base64,${base64}`, fileName,
              });
              return;
            }
            // 1 MB cap and binary detection via null bytes
            if (bytes.length > 1024 * 1024) {
              webviewPanel.webview.postMessage({
                command: "filePreview", type: "binary", fileName,
              });
              return;
            }
            const checkLen = Math.min(bytes.length, 8192);
            for (let i = 0; i < checkLen; i++) {
              if (bytes[i] === 0) {
                webviewPanel.webview.postMessage({
                  command: "filePreview", type: "binary", fileName,
                });
                return;
              }
            }
            const content = new TextDecoder("utf-8").decode(bytes);
            const isMarkdown = ext === "md" || ext === "markdown" || ext === "mdx";
            webviewPanel.webview.postMessage({
              command: "filePreview",
              type: isMarkdown ? "markdown" : "code",
              content,
              extension: ext,
              fileName,
            });
            return;
          }
          case "mkdir": {
            const dirUri = vscode.Uri.parse(message.currentDirectoryUri);
            const folderName = await vscode.window.showInputBox({
              prompt: "New folder name",
              validateInput: (value) => {
                if (!value || value.trim() === "") return "Name cannot be empty";
                if (value.includes("/") || value.includes("\\"))
                  return "Name cannot contain slashes";
                return null;
              },
            });
            if (folderName && folderName.trim()) {
              const newDirUri = vscode.Uri.joinPath(dirUri, folderName.trim());
              try {
                await vscode.workspace.fs.createDirectory(newDirUri);
              } catch (err) {
                vscode.window.showErrorMessage(`Create folder failed: ${err}`);
              }
            }
            webviewPanel.webview.postMessage({
              command: "operationComplete",
              pane: message.pane,
            });
            return;
          }
          case "copyFiles": {
            const uris: string[] = message.uris;
            const targetDirUri = vscode.Uri.parse(message.targetDirectoryUri);
            for (const uriStr of uris) {
              const srcUri = vscode.Uri.parse(uriStr);
              const name = srcUri.path.split("/").pop() || "";
              const destUri = vscode.Uri.joinPath(targetDirUri, name);
              try {
                await vscode.workspace.fs.copy(srcUri, destUri, {
                  overwrite: false,
                });
              } catch (err) {
                vscode.window.showErrorMessage(`Copy failed for ${name}: ${err}`);
              }
            }
            webviewPanel.webview.postMessage({
              command: "operationComplete",
              pane: message.pane,
              reloadOtherPane: true,
            });
            return;
          }
          case "moveFiles": {
            const uris: string[] = message.uris;
            const targetDirUri = vscode.Uri.parse(message.targetDirectoryUri);
            for (const uriStr of uris) {
              const srcUri = vscode.Uri.parse(uriStr);
              const name = srcUri.path.split("/").pop() || "";
              const destUri = vscode.Uri.joinPath(targetDirUri, name);
              // Both panes may show the same directory — moving onto itself is a no-op
              if (destUri.toString() === srcUri.toString()) continue;
              try {
                await vscode.workspace.fs.rename(srcUri, destUri, {
                  overwrite: false,
                });
              } catch (err) {
                vscode.window.showErrorMessage(`Move failed for ${name}: ${err}`);
              }
            }
            webviewPanel.webview.postMessage({
              command: "operationComplete",
              pane: message.pane,
              reloadOtherPane: true,
            });
            return;
          }
        }
      },
    );

    if (webviewPanel.active) {
      this._activePanel = webviewPanel;
    }
    webviewPanel.onDidChangeViewState(() => {
      if (webviewPanel.active) {
        this._activePanel = webviewPanel;
      }
    });

    webviewPanel.onDidDispose(() => {
      if (this._activePanel === webviewPanel) {
        this._activePanel = undefined;
      }
      messageHandler.dispose();
    });
  }

  private async getDirectoryContents(uri: vscode.Uri): Promise<any[]> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      const items = await Promise.all(
        entries.map(async ([name, type]) => {
          const itemUri = vscode.Uri.joinPath(uri, name);
          let size: number | undefined;
          let lastModified: number | undefined;
          try {
            const stat = await vscode.workspace.fs.stat(itemUri);
            size = stat.size;
            lastModified = stat.mtime;
          } catch { /* stat unavailable */ }
          return {
            name,
            type: type === vscode.FileType.Directory ? "directory" : "file",
            uri: itemUri.toString(),
            size,
            lastModified,
          };
        }),
      );
      return items;
    } catch (error) {
      console.error("Error reading directory:", error);
      return [];
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css"),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' 'strict-dynamic';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>VS Commander</title>
      </head>
      <body>
        <div id="crank-root"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

interface DirectorySummary {
  files: number;
  folders: number;
  totalSize: number;
  truncated: boolean;
}

// Quick View has to stay quick, so the walk gives up once either budget is
// spent and reports what it managed to count as a lower bound
const SCAN_ENTRY_LIMIT = 50000;
const SCAN_TIME_BUDGET_MS = 1500;
// readDirectory has no sizes, so every file costs a stat; batching them keeps
// the walk from being one round-trip deep, which matters most on remote hosts
const STAT_CONCURRENCY = 64;

async function summarizeDirectory(uri: vscode.Uri): Promise<DirectorySummary> {
  const summary: DirectorySummary = {
    files: 0,
    folders: 0,
    totalSize: 0,
    truncated: false,
  };
  const deadline = Date.now() + SCAN_TIME_BUDGET_MS;
  const queue: vscode.Uri[] = [uri];
  let seen = 0;
  const exhausted = () => seen >= SCAN_ENTRY_LIMIT || Date.now() > deadline;

  while (queue.length > 0) {
    if (exhausted()) {
      summary.truncated = true;
      break;
    }
    const dir = queue.shift()!;
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dir);
    } catch {
      continue; // unreadable directory — skip it rather than fail the preview
    }
    const filesToStat: vscode.Uri[] = [];
    for (const [name, type] of entries) {
      if (exhausted()) {
        summary.truncated = true;
        break;
      }
      seen++;
      const childUri = vscode.Uri.joinPath(dir, name);
      // Exact match excludes symlinked directories, which keeps the walk finite;
      // they count as files, and stat resolves to the link target's size
      if (type === vscode.FileType.Directory) {
        summary.folders++;
        queue.push(childUri);
      } else {
        summary.files++;
        filesToStat.push(childUri);
      }
    }
    summary.totalSize += await totalSizeOf(filesToStat);
  }
  return summary;
}

async function totalSizeOf(uris: vscode.Uri[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < uris.length; i += STAT_CONCURRENCY) {
    const sizes = await Promise.all(
      uris.slice(i, i + STAT_CONCURRENCY).map(async (uri) => {
        try {
          return (await vscode.workspace.fs.stat(uri)).size;
        } catch {
          return 0; // size unavailable
        }
      }),
    );
    for (const size of sizes) total += size;
  }
  return total;
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
