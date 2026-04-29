/** @jsxImportSource @b9g/crank */

export type QuickViewState =
  | { status: "loading"; fileName: string }
  | { status: "html"; html: string; fileName: string; isCode: boolean }
  | { status: "image"; src: string; fileName: string }
  | { status: "binary"; fileName: string };

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
