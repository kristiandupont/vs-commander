# VS Commander

A VS Code extension that provides a Norton Commander style dual-pane file manager as an editor tab.

## Features

- Dual-pane file browsing in editor tabs
- Multiple VS Commander windows open simultaneously
- Navigate directories by double-clicking
- Open files directly in VS Code
- Works with both local and remote files (via VS Code's remote development)

## Usage

### Opening VS Commander

1. Run the command "New VS Commander Window" from the command palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Each window opens as a tab in the editor area without creating any files on disk

### Using the Interface

- **Navigate**: Double-click directories to enter them
- **Open files**: Double-click files to open them in VS Code
- **Change path**: Type directly in the path input fields and press Enter
- **Multiple windows**: Open multiple commander tabs to have different panes open simultaneously

## Development

### Prerequisites

- Node.js
- VS Code

### Setup

1. Clone the repository
2. Run `npm install`
3. Press F5 to launch the extension development host

### Building

```bash
npm run compile
```

### Testing

```bash
npm test
```
