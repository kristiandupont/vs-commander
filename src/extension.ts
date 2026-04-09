import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("VS Commander is now active!");

  // Register the webview provider for the view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      VSCommanderViewProvider.viewType,
      new VSCommanderViewProvider(context.extensionUri),
    ),
  );

  // Register command to open the view
  let disposable = vscode.commands.registerCommand("vsCommander.open", () => {
    vscode.commands.executeCommand("workbench.view.explorer");
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

class VSCommanderViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "vsCommanderView";

  constructor(private readonly _extensionUri: vscode.Uri) {} // eslint-disable-line no-unused-vars

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext, // eslint-disable-line no-unused-vars
    _token: vscode.CancellationToken, // eslint-disable-line no-unused-vars
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    const messageHandler = webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "getWorkspaceFolders": {
            const folders =
              vscode.workspace.workspaceFolders?.map((f) => ({
                name: f.name,
                uri: f.uri.toString(),
              })) || [];
            webviewView.webview.postMessage({
              command: "workspaceFolders",
              folders,
            });
            return;
          }
          case "getDirectoryContents": {
            const contents = await this.getDirectoryContents(
              vscode.Uri.parse(message.uri),
            );
            webviewView.webview.postMessage({
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
        }
      },
    );

    webviewView.onDidDispose(() => {
      messageHandler.dispose();
    });
  }

  private async getDirectoryContents(uri: vscode.Uri): Promise<any[]> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      return entries.map(([name, type]) => ({
        name,
        type: type === vscode.FileType.Directory ? "directory" : "file",
        uri: vscode.Uri.joinPath(uri, name).toString(),
      }));
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
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>VS Commander</title>
      </head>
      <body>
        <div class="commander">
          <div class="pane" id="left-pane">
            <div class="pane-header">
              <input type="text" id="left-path" placeholder="Path">
            </div>
            <div class="pane-content" id="left-content"></div>
          </div>
          <div class="pane" id="right-pane">
            <div class="pane-header">
              <input type="text" id="right-path" placeholder="Path">
            </div>
            <div class="pane-content" id="right-content"></div>
          </div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
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
