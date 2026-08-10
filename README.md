# VS Commander

A VS Code extension that provides a Norton Commander style dual-pane file manager as an editor tab.

## Features

- Dual-pane file browsing in editor tabs
- Multiple VS Commander windows open simultaneously
- **State persistence**: Remembers folders, selections, and scroll position when switching tabs
- Navigate directories by double-clicking or pressing Enter
- Open files directly in VS Code
- **Keyboard navigation**: Use arrow keys to move selection, Shift+arrow for multi-selection
- **Selection system**: Single selection per window, Shift+arrow for multi-selection
- **Parent directory**: ".." item at the top to go up one level (click or Enter)
- **File operations**: Copy, move, rename, delete, and create folders
- **Quick View**: Peek at a file's contents — or a folder's size and file count — without opening it
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

### Keyboard shortcuts

| Key      | Action                                                     |
| -------- | ---------------------------------------------------------- |
| Arrows   | Move selection (Shift extends it)                          |
| Tab      | Switch pane                                                |
| Enter    | Enter directory / open file                                |
| Space    | Quick View of the selected file or folder (Space or Escape closes) |
| F2       | Rename                                                     |
| F5       | Copy selection to the directory shown in the opposite pane |
| F6       | Move selection to the directory shown in the opposite pane |
| F7       | New folder                                                 |
| Delete   | Delete selection (with confirmation)                       |

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
