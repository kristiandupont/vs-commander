// Shared VS Code webview API access

type VsCodeApi = {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

declare global {
  const acquireVsCodeApi: () => VsCodeApi;
}

// eslint-disable-next-line no-undef
export const vscode = acquireVsCodeApi();
