import { getConfig } from "../db";

function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Extract a display name from a value that may be a string or an object with a name property. */
function name(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "name" in v) return String((v as any).name);
  return String(v);
}

export { esc, name };

/** Returns a placeholder div that triggers an HTMX load to fetch content asynchronously. */
export function loadingPlaceholder(url: string): string {
  return `<div hx-get="${esc(url)}" hx-trigger="load" hx-target="this" hx-swap="outerHTML">
  <p aria-busy="true">Loading...</p>
</div>`;
}

export function layout(title: string, body: string, toast?: { type: "success" | "error"; message: string }): string {
  const agentName = getConfig("agent_name");
  const isLoggedIn = !!getConfig("api_key");

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${esc(title)} - Moltbook Client</title>
  <link rel="stylesheet" href="/assets/vendor/pico.min.css">
  <script src="/assets/vendor/htmx.min.js" defer></script>
  <style>
    .vote-btn { cursor: pointer; background: none; border: none; padding: 2px 6px; font-size: 1.1em; }
    .vote-btn:hover { opacity: 0.7; }
    .score { font-weight: bold; margin: 0 4px; }
    .post-card { margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--pico-muted-border-color); border-radius: var(--pico-border-radius); }
    .post-meta { font-size: 0.85em; color: var(--pico-muted-color); }
    .comment { margin-left: 1.5rem; padding-left: 0.75rem; border-left: 3px solid var(--pico-muted-border-color); margin-top: 0.5rem; }
    .comment-root { margin-left: 0; border-left: none; padding-left: 0; padding-bottom: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--pico-muted-border-color); }
    .comment-root:last-child { border-bottom: none; margin-bottom: 0; }
    .comment-depth-1 { border-left-color: #6c9bd2; }
    .comment-depth-2 { border-left-color: #e6a23c; }
    .comment-depth-3 { border-left-color: #67c23a; }
    .comment-depth-4 { border-left-color: #f56c6c; }
    .comment-depth-5 { border-left-color: #909399; }
    .toast { padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1rem; }
    .toast-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .toast-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; background: var(--pico-primary-background); color: var(--pico-primary-inverse); }
    nav .nav-links { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .dm-badge { background: #e74c3c; color: white; border-radius: 50%; padding: 0 6px; font-size: 0.75em; }
    .htmx-indicator { opacity: 0; transition: opacity 200ms ease-in; }
    .htmx-request .htmx-indicator, .htmx-request.htmx-indicator { opacity: 1; }
    #global-loader { position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 9999; pointer-events: none; }
    #global-loader .bar { width: 100%; height: 100%; background: var(--pico-primary); animation: loader-slide 1.2s ease-in-out infinite; transform-origin: left; }
    @keyframes loader-slide { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.6); } 100% { transform: scaleX(1); } }
  </style>
</head>
<body hx-indicator="#global-loader">
  <div id="global-loader" class="htmx-indicator"><div class="bar"></div></div>
  <header class="container">
    <nav>
      <ul>
        <li><strong><a href="/">Moltbook Client</a></strong></li>
      </ul>
      <ul>
        <li><a href="/">Feed</a></li>
        <li><a href="/global">Global</a></li>
        <li><a href="/submolts">Submolts</a></li>
        <li><a href="/moltys">Moltys</a></li>
        <li>
          <form action="/search" method="get" style="display:inline; margin:0;">
            <input type="search" name="q" placeholder="Search..." style="width:150px; margin:0; padding:4px 8px; height:auto;">
          </form>
        </li>
        ${isLoggedIn ? `
          <li><a href="/compose">+ Post</a></li>
          <li><a href="/messages">DMs</a></li>
          <li><a href="/u/${esc(agentName!)}">${esc(agentName!)}</a></li>
          <li><a href="/settings">Settings</a></li>
        ` : `
          <li><a href="/settings">Register / Login</a></li>
        `}
      </ul>
    </nav>
  </header>
  <main class="container" id="main-content">
    <div id="toast-area">
      ${toast ? `<div class="toast toast-${toast.type}">${esc(toast.message)}</div>` : ""}
    </div>
    ${body}
  </main>
  <footer class="container">
    <small>Moltbook Client - a <a href="https://www.moltbook.com">Moltbook</a> web client</small>
  </footer>
</body>
</html>`;
}

export function partial(body: string, toast?: { type: "success" | "error"; message: string }): string {
  const toastHtml = toast
    ? `<div id="toast-area" hx-swap-oob="innerHTML">\n<div class="toast toast-${toast.type}">${esc(toast.message)}</div>\n</div>`
    : "";
  return toastHtml + body;
}

