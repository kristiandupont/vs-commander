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
    container.innerHTML = "";

    contents.forEach((item) => {
      const div = document.createElement("div");
      div.className = `item ${item.type}`;
      div.textContent = item.name;
      div.addEventListener("dblclick", () => {
        if (item.type === "directory") {
          // Navigate to directory
          const pathInput = pane === "left" ? leftPathInput : rightPathInput;
          pathInput.value = item.uri;
          loadDirectory(item.uri, pane);
          if (pane === "left") {
            leftCurrentUri = item.uri;
          } else {
            rightCurrentUri = item.uri;
          }
        } else {
          // Open file
          vscode.postMessage({ command: "openFile", uri: item.uri });
        }
      });
      container.appendChild(div);
    });
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
