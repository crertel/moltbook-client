import { join, extname, dirname } from "path";
import { existsSync } from "fs";
import { esc, layout } from "./templates/layout";
import { handleAuth } from "./routes/auth";
import { handleFeed } from "./routes/feed";
import { handlePosts } from "./routes/posts";
import { handleComments } from "./routes/comments";
import { handleSubmolts } from "./routes/submolts";
import { handleProfile } from "./routes/profile";
import { handleMessages } from "./routes/messages";
import { handleModeration } from "./routes/moderation";
import { handleSearch } from "./routes/search";
import { handleMoltys } from "./routes/moltys";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "127.0.0.1";
const DEV_ASSETS_DIR = join(import.meta.dir, "assets");
const PROD_ASSETS_DIR = join(dirname(process.execPath), "assets");
const ASSETS_DIR = existsSync(PROD_ASSETS_DIR) ? PROD_ASSETS_DIR : DEV_ASSETS_DIR;

// Route handlers in priority order
const handlers = [
  handleAuth,
  handleFeed,
  handleSearch,
  handleMoltys,
  handleComments, // before posts so /posts/:id/comments matches first
  handlePosts,
  handleSubmolts,
  handleModeration, // /s/:name/mod/* before submolt detail catch-all
  handleProfile,
  handleMessages,
];

function contentTypeForPath(p: string): string {
  switch (extname(p).toLowerCase()) {
    case ".css": return "text/css; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".ico": return "image/x-icon";
    default: return "application/octet-stream";
  }
}

function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);

  // Safer defaults for a local web UI that may hold credentials.
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=()");

  // No remote scripts/styles; keep inline styles for now (templates use many style="" attrs).
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
    ].join("; ")
  );

  const ct = headers.get("Content-Type") ?? "";
  if (ct.startsWith("text/html")) {
    headers.set("Cache-Control", "no-store");
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Static assets (vendored dependencies, icons, etc.)
    if ((req.method === "GET" || req.method === "HEAD") && path.startsWith("/assets/")) {
      const rel = path.slice("/assets/".length);
      // Prevent path traversal and weird separators.
      if (!rel || rel.includes("..") || rel.includes("\\") || rel.startsWith("/")) {
        return withSecurityHeaders(new Response("Bad Request", { status: 400 }));
      }
      const fsPath = join(ASSETS_DIR, rel);
      const file = Bun.file(fsPath);
      if (!(await file.exists())) {
        return withSecurityHeaders(new Response("Not Found", { status: 404 }));
      }
      const headers = new Headers({
        "Content-Type": contentTypeForPath(fsPath),
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      return withSecurityHeaders(new Response(file, { headers }));
    }

    // Try each route handler
    for (const handler of handlers) {
      try {
        const response = await handler(req, path);
        if (response) return withSecurityHeaders(response);
      } catch (e: any) {
        console.error(`Handler error: ${e.message}`);
        const body = `<h2>Error</h2><p>${esc(e.message ?? "Something went wrong")}</p>`;
        return withSecurityHeaders(new Response(layout("Error", body), {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }));
      }
    }

    // 404
    const body = `<h2>404 - Not Found</h2><p>The page <code>${esc(path)}</code> doesn't exist.</p><p><a href="/">Go home</a></p>`;
    return withSecurityHeaders(new Response(layout("Not Found", body), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    }));
  },
});

console.log(`Moltbook Client listening on http://${HOST}:${PORT}`);
