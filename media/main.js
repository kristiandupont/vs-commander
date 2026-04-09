// @ts-check

(function () {
  const vscode = acquireVsCodeApi();

  // Elements
  const leftPathInput = document.getElementById("left-path");
  const rightPathInput = document.getElementById("right-path");
  const leftContent = document.getElementById("left-content");
  const rightContent = document.getElementById("right-content");

  // State
  let leftCurrentUri = "";
  let rightCurrentUri = "";
  let activePane = "left"; // 'left' or 'right'
  let leftSelectedIndices = new Set([0]); // Selected item indices
  let rightSelectedIndices = new Set([0]);
  let leftFocusIndex = 0; // Currently focused item index
  let rightFocusIndex = 0;

  // Initialize with workspace folders
  window.addEventListener("load", () => {
    // Get workspace folders
    vscode.postMessage({ command: "getWorkspaceFolders" });
  });

  // Handle messages from extension
  window.addEventListener("message", (event) => {
    const message = event.data;

    switch (message.command) {
      case "workspaceFolders":
        initializePanes(message.folders);
        break;
      case "directoryContents":
        displayDirectoryContents(message.contents, message.pane);
        break;
    }
  });

  function initializePanes(folders) {
    if (folders && folders.length > 0) {
      // Set left pane to first workspace folder
      leftCurrentUri = folders[0].uri;
      leftPathInput.value = folders[0].uri;
      loadDirectory(leftCurrentUri, "left");

      // Set right pane to same or second folder
      if (folders.length > 1) {
        rightCurrentUri = folders[1].uri;
        rightPathInput.value = folders[1].uri;
        loadDirectory(rightCurrentUri, "right");
      } else {
        rightCurrentUri = folders[0].uri;
        rightPathInput.value = folders[0].uri;
        loadDirectory(rightCurrentUri, "right");
      }
    }
  }

  function loadDirectory(uri, pane) {
    vscode.postMessage({ command: "getDirectoryContents", uri, pane });
  }

  function displayDirectoryContents(contents, pane) {
    const container = pane === "left" ? leftContent : rightContent;
    const selectedIndices = pane === "left" ? leftSelectedIndices : rightSelectedIndices;
    const focusIndex = pane === "left" ? leftFocusIndex : rightFocusIndex;

    container.innerHTML = "";

    // Add parent directory item ("..")
    const parentItem = document.createElement("div");
    parentItem.className = "item directory parent";
    parentItem.textContent = "..";
    parentItem.dataset.index = "0";
    parentItem.addEventListener("click", () => {
      handleItemClick(0, pane);
    });
    if (selectedIndices.has(0)) {
      parentItem.classList.add("selected");
    }
    if (activePane === pane && focusIndex === 0) {
      parentItem.classList.add("focused");
    }
    container.appendChild(parentItem);

    // Add directory contents
    contents.forEach((item, index) => {
      const actualIndex = index + 1; // +1 because .. is at index 0
      const div = document.createElement("div");
      div.className = `item ${item.type}`;
      div.textContent = item.name;
      div.dataset.index = actualIndex.toString();
      div.dataset.uri = item.uri;

      div.addEventListener("click", () => {
        handleItemClick(actualIndex, pane);
      });

      if (selectedIndices.has(actualIndex)) {
        div.classList.add("selected");
      }
      if (activePane === pane && focusIndex === actualIndex) {
        div.classList.add("focused");
      }

      container.appendChild(div);
    });
  }

  function handleItemClick(index, pane) {
    // Switch active pane if clicking on different pane
    if (activePane !== pane) {
      activePane = pane;
      updatePaneFocus();
    }

    // Handle selection based on modifier keys
    if (event.shiftKey) {
      // Shift+click: extend selection
      const currentFocus = pane === "left" ? leftFocusIndex : rightFocusIndex;
      const selectedIndices = pane === "left" ? leftSelectedIndices : rightSelectedIndices;

      selectedIndices.clear();
      const start = Math.min(currentFocus, index);
      const end = Math.max(currentFocus, index);
      for (let i = start; i <= end; i++) {
        selectedIndices.add(i);
      }
    } else {
      // Regular click: single selection
      const selectedIndices = pane === "left" ? leftSelectedIndices : rightSelectedIndices;
      selectedIndices.clear();
      selectedIndices.add(index);
    }

    // Update focus
    if (pane === "left") {
      leftFocusIndex = index;
    } else {
      rightFocusIndex = index;
    }

    updateDisplay();
  }

  function updatePaneFocus() {
    // Update visual focus indicators
    updateDisplay();
  }

  function updateDisplay() {
    // Re-render both panes to update selection and focus
    if (leftCurrentUri) {
      loadDirectory(leftCurrentUri, "left");
    }
    if (rightCurrentUri) {
      loadDirectory(rightCurrentUri, "right");
    }
  }

  // Handle keyboard navigation
  document.addEventListener("keydown", (e) => {
    const selectedIndices = activePane === "left" ? leftSelectedIndices : rightSelectedIndices;
    const focusIndex = activePane === "left" ? leftFocusIndex : rightFocusIndex;
    const container = activePane === "left" ? leftContent : rightContent;
    const itemCount = container.children.length;

    if (itemCount === 0) return;

    let newFocusIndex = focusIndex;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        newFocusIndex = Math.max(0, focusIndex - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        newFocusIndex = Math.min(itemCount - 1, focusIndex + 1);
        break;
      case "Enter":
        e.preventDefault();
        handleEnterKey();
        return;
      case "Tab":
        e.preventDefault();
        // Switch active pane
        activePane = activePane === "left" ? "right" : "left";
        updatePaneFocus();
        return;
    }

    if (newFocusIndex !== focusIndex) {
      if (e.shiftKey) {
        // Shift+arrow: extend selection
        selectedIndices.clear();
        const start = Math.min(focusIndex, newFocusIndex);
        const end = Math.max(focusIndex, newFocusIndex);
        for (let i = start; i <= end; i++) {
          selectedIndices.add(i);
        }
      } else {
        // Regular arrow: move focus and single selection
        selectedIndices.clear();
        selectedIndices.add(newFocusIndex);
      }

      if (activePane === "left") {
        leftFocusIndex = newFocusIndex;
      } else {
        rightFocusIndex = newFocusIndex;
      }

      updateDisplay();
    }
  });

  function handleEnterKey() {
    const focusIndex = activePane === "left" ? leftFocusIndex : rightFocusIndex;
    const currentUri = activePane === "left" ? leftCurrentUri : rightCurrentUri;
    const pathInput = activePane === "left" ? leftPathInput : rightPathInput;

    if (focusIndex === 0) {
      // Parent directory ("..")
      const parentUri = getParentUri(currentUri);
      if (parentUri) {
        pathInput.value = parentUri;
        if (activePane === "left") {
          leftCurrentUri = parentUri;
        } else {
          rightCurrentUri = parentUri;
        }
        loadDirectory(parentUri, activePane);
      }
    } else {
      // Regular item - simulate double click
      const container = activePane === "left" ? leftContent : rightContent;
      const item = container.children[focusIndex];
      if (item && item.classList.contains("directory")) {
        // Navigate to directory
        const uri = item.dataset.uri;
        if (uri) {
          pathInput.value = uri;
          if (activePane === "left") {
            leftCurrentUri = uri;
          } else {
            rightCurrentUri = uri;
          }
          loadDirectory(uri, activePane);
        }
      } else if (item) {
        // Open file
        const uri = item.dataset.uri;
        if (uri) {
          vscode.postMessage({ command: "openFile", uri });
        }
      }
    }
  }

  function getParentUri(uri) {
    const parsedUri = vscode.Uri.parse(uri);
    const pathParts = parsedUri.path.split("/");
    if (pathParts.length > 1) {
      pathParts.pop();
      const parentPath = pathParts.join("/") || "/";
      return parsedUri.with({ path: parentPath }).toString();
    }
    return null;
  }

  // Handle path input changes
  leftPathInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      leftCurrentUri = leftPathInput.value;
      loadDirectory(leftCurrentUri, "left");
    }
  });

  rightPathInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      rightCurrentUri = rightPathInput.value;
      loadDirectory(rightCurrentUri, "right");
    }
  });
})();
