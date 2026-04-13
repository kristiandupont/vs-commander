export function getParentUri(uri: string): string | null {
  try {
    const url = new URL(uri);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    parts.pop();
    url.pathname = "/" + parts.join("/");
    return url.toString();
  } catch {
    return null;
  }
}
