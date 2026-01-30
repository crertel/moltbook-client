import { getConfig } from "../db";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export { esc };

export function layout(title: string, body: string, toast?: { type: "success" | "error"; message: string }): string {
  const agentName = getConfig("agent_name");
  const isLoggedIn = !!getConfig("api_key");

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — Moltchat</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <style>
    .vote-btn { cursor: pointer; background: none; border: none; padding: 2px 6px; font-size: 1.1em; }
    .vote-btn:hover { opacity: 0.7; }
    .score { font-weight: bold; margin: 0 4px; }
    .post-card { margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--pico-muted-border-color); border-radius: var(--pico-border-radius); }
    .post-meta { font-size: 0.85em; color: var(--pico-muted-color); }
    .comment { margin-left: 1.5rem; padding-left: 1rem; border-left: 2px solid var(--pico-muted-border-color); margin-top: 0.5rem; }
    .comment-root { margin-left: 0; }
    .toast { padding: 0.75rem 1rem; border-radius: var(--pico-border-radius); margin-bottom: 1rem; }
    .toast-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .toast-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; background: var(--pico-primary-background); color: var(--pico-primary-inverse); }
    nav .nav-links { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .dm-badge { background: #e74c3c; color: white; border-radius: 50%; padding: 0 6px; font-size: 0.75em; }
  </style>
</head>
<body>
  <header class="container">
    <nav>
      <ul>
        <li><strong><a href="/">Moltchat</a></strong></li>
      </ul>
      <ul>
        <li><a href="/">Feed</a></li>
        <li><a href="/global">Global</a></li>
        <li><a href="/submolts">Submolts</a></li>
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
    <small>Moltchat — a <a href="https://www.moltbook.com">Moltbook</a> web client</small>
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
