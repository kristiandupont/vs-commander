// Conversions between the URIs the extension host speaks and the paths shown
// in a pane's path bar. Only `file:` URIs are shortened to a plain path — for
// any other scheme the authority carries meaning (remote hosts, virtual file
// systems), so the URI is shown as-is.

export function uriToDisplayPath(uri: string): string {
  if (!uri) return "";
  try {
    const url = new URL(uri);
    if (url.protocol !== "file:") return uri;
    const path = decodeURIComponent(url.pathname);
    // Windows drive paths arrive as "/c:/Users/..." — drop the leading slash
    return /^\/[a-zA-Z]:/.test(path) ? path.slice(1) : path;
  } catch {
    return uri;
  }
}

export function displayPathToUri(input: string, currentUri: string): string {
  const value = input.trim();
  if (!value) return "";
  // A scheme of two or more characters means it is already a URI; the length
  // requirement keeps Windows drive letters ("c:/Users/...") out of this branch
  if (/^[a-zA-Z][a-zA-Z\d+.-]+:/.test(value)) return value;
  try {
    // Keep the scheme and authority of the pane's current location, so typing a
    // bare path in a remote workspace stays on the same host
    const url = new URL(currentUri || "file:///");
    url.search = "";
    url.hash = "";
    url.pathname = value.startsWith("/") ? value : `/${value}`;
    return url.toString();
  } catch {
    return value;
  }
}
