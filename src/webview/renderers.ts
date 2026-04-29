import { marked } from "marked";
import hljs from "highlight.js/lib/common";

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript",
  jsx: "javascript",
  ts: "typescript", tsx: "typescript", mts: "typescript",
  py: "python", pyw: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin", kts: "kotlin",
  swift: "swift",
  c: "c", h: "c",
  cpp: "cpp", cxx: "cpp", cc: "cpp", hpp: "cpp",
  cs: "csharp",
  php: "php",
  html: "html", htm: "html",
  xml: "xml",
  css: "css", scss: "scss", less: "less",
  json: "json", jsonc: "json",
  yaml: "yaml", yml: "yaml",
  sh: "bash", bash: "bash", zsh: "bash",
  sql: "sql",
  dockerfile: "dockerfile",
  md: "markdown", markdown: "markdown",
  toml: "ini", ini: "ini",
  lua: "lua",
  r: "r",
  scala: "scala",
  ex: "elixir", exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  pl: "perl",
  ps1: "powershell",
  vim: "vim",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}

export function renderCode(content: string, ext: string): string {
  const lang = EXT_TO_LANG[ext];
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(content, { language: lang }).value;
    }
    return hljs.highlightAuto(content).value;
  } catch {
    return escapeHtml(content);
  }
}
