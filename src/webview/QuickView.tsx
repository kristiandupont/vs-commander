/** @jsxImportSource @b9g/crank */

import { formatBytes } from "./formatBytes";
import { DirectorySummary } from "./types";

export type QuickViewState =
  | { status: "loading"; fileName: string }
  | { status: "html"; html: string; fileName: string; isCode: boolean }
  | { status: "image"; src: string; fileName: string }
  | { status: "binary"; fileName: string }
  | { status: "directory"; fileName: string; summary: DirectorySummary };

function DirectorySummaryView({ summary }: { summary: DirectorySummary }) {
  const rows: [string, string][] = [
    ["Files", summary.files.toLocaleString()],
    ["Folders", summary.folders.toLocaleString()],
    ["Total size", formatBytes(summary.totalSize)],
  ];

  return (
    <div class="quickview-stats">
      {rows.map(([label, value]) => (
        <div class="quickview-stat" key={label}>
          <span class="quickview-stat-label">{label}</span>
          <span class="quickview-stat-value">
            {summary.truncated ? `at least ${value}` : value}
          </span>
        </div>
      ))}
      {summary.truncated && (
        <p class="quickview-stat-note">
          This folder is too large to scan quickly — the numbers above cover
          only the part that was scanned.
        </p>
      )}
    </div>
  );
}

export function QuickView({
  state,
  onClose,
}: {
  state: QuickViewState;
  onClose: () => void;
}) {
  return (
    <div
      class="quickview-overlay"
      onclick={(e: MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains("quickview-overlay")) {
          onClose();
        }
      }}
    >
      <div class="quickview-panel">
        <div class="quickview-header">
          <span class="quickview-filename">{state.fileName}</span>
          <button class="quickview-close" onclick={onClose}>
            ✕
          </button>
        </div>
        <div class="quickview-body">
          {state.status === "loading" && (
            <div class="quickview-placeholder">Loading…</div>
          )}
          {state.status === "binary" && (
            <div class="quickview-placeholder">Binary file</div>
          )}
          {state.status === "directory" && (
            <DirectorySummaryView summary={state.summary} />
          )}
          {state.status === "image" && (
            <img class="quickview-image" src={state.src} />
          )}
          {state.status === "html" &&
            (state.isCode ? (
              <pre class="quickview-code">
                <code innerHTML={state.html} />
              </pre>
            ) : (
              <div class="quickview-markdown" innerHTML={state.html} />
            ))}
        </div>
      </div>
    </div>
  );
}
