# VS Commander

A VS Code extension that provides a Norton Commander style dual-pane file manager as an editor tab.

## Features

- Dual-pane file browsing in editor tabs
- Multiple VS Commander windows open simultaneously
- Navigate directories by double-clicking or pressing Enter
- Open files directly in VS Code
- **Keyboard navigation**: Use arrow keys to move selection, Tab to switch panes
- **Selection system**: Single selection per window, Shift+arrow for multi-selection
- **Parent directory**: ".." item at the top to go up one level
- Works with both local and remote files (via VS Code's remote development)

## Usage

### Opening VS Commander

1. Run the command "New VS Commander Window" from the command palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Each window opens as a tab in the editor area without creating any files on disk

### Navigation

- **Mouse**: Double-click directories to navigate, click to select
- **Keyboard**:
  - Arrow keys: Move selection up/down
  - Shift + Arrow keys: Extend selection
  - Enter: Navigate into selected directory or open file
  - Tab: Switch between left and right panes
- **Parent directory**: Select ".." (top item) and press Enter to go up one level
- **Path input**: Type directly in path fields and press Enter to navigate
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
