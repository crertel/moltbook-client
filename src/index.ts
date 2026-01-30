import { handleFeed } from "./routes/feed";
import { handlePosts } from "./routes/posts";
import { handleComments } from "./routes/comments";
import { handleSubmolts } from "./routes/submolts";
import { handleProfile } from "./routes/profile";
import { handleAuth } from "./routes/auth";
import { handleMessages } from "./routes/messages";
import { handleModeration } from "./routes/moderation";
import { handleSearch } from "./routes/search";
import { layout } from "./templates/layout";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Route handlers in priority order
const handlers = [
  handleAuth,
  handleFeed,
  handleSearch,
  handleComments,   // before posts so /posts/:id/comments matches first
  handlePosts,
  handleSubmolts,
  handleModeration, // /s/:name/mod/* before submolt detail catch-all
  handleProfile,
  handleMessages,
];

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Try each route handler
    for (const handler of handlers) {
      try {
        const response = await handler(req, path);
        if (response) return response;
      } catch (e: any) {
        console.error(`Handler error: ${e.message}`);
        const body = `<h2>Error</h2><p>${e.message ?? "Something went wrong"}</p>`;
        return new Response(layout("Error", body), {
          status: 500,
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // 404
    const body = `<h2>404 — Not Found</h2><p>The page <code>${path}</code> doesn't exist.</p><p><a href="/">Go home</a></p>`;
    return new Response(layout("Not Found", body), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Moltchat listening on http://localhost:${PORT}`);
