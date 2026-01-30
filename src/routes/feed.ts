import { layout, partial } from "../templates/layout";
import { feedPage } from "../templates/feed";
import * as api from "../api";
import { cachePost, getConfig } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleFeed(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);

  // GET / — personalized feed (or global if not logged in)
  if (path === "/" && req.method === "GET") {
    let posts: any[] = [];
    let feedType: "personal" | "global" = "personal";
    try {
      if (getConfig("api_key")) {
        const data = await api.getPersonalizedFeed(page);
        posts = data.posts ?? data ?? [];
      } else {
        const data = await api.getGlobalFeed(page);
        posts = data.posts ?? data ?? [];
        feedType = "global";
      }
      for (const p of posts) cachePost(p);
    } catch { /* show empty */ }

    const body = feedPage(posts, feedType, page);
    if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
    return new Response(layout("Feed", body), { headers: { "Content-Type": "text/html" } });
  }

  // GET /global
  if (path === "/global" && req.method === "GET") {
    let posts: any[] = [];
    try {
      const data = await api.getGlobalFeed(page);
      posts = data.posts ?? data ?? [];
      for (const p of posts) cachePost(p);
    } catch { /* show empty */ }

    const body = feedPage(posts, "global", page);
    if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
    return new Response(layout("Global Feed", body), { headers: { "Content-Type": "text/html" } });
  }

  return null;
}
