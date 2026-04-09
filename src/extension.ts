import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("VS Commander is now active!");

  // Register the custom editor provider
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      VSCommanderEditorProvider.viewType,
      new VSCommanderEditorProvider(context.extensionUri, context),
    ),
  );

  // Register command to create a new commander window
  let disposable = vscode.commands.registerCommand(
    "vsCommander.new",
    async () => {
      const sessionId = Date.now().toString();
      const uri = vscode.Uri.parse(
        `untitled:VS Commander Session ${sessionId}`,
      );
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

  constructor(
    private readonly _extensionUri: vscode.Uri, // eslint-disable-line no-unused-vars
    private readonly _context: vscode.ExtensionContext, // eslint-disable-line no-unused-vars
  ) {}

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
        }
      },
    );

    webviewPanel.onDidDispose(() => {
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
