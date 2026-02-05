import { layout, partial, esc, loadingPlaceholder } from "../templates/layout";
import { submoltsListPage, submoltDetailPage, createSubmoltPage } from "../templates/submolts";
import * as api from "../api";
import { cachePost, logAction } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

// Simple in-memory cache for submolt names (for typeahead)
let submoltNameCache: string[] = [];
let submoltCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSubmoltNames(): Promise<string[]> {
  if (Date.now() - submoltCacheTime < CACHE_TTL && submoltNameCache.length > 0) {
    return submoltNameCache;
  }
  const names: string[] = [];
  for (let page = 1; page <= 5; page++) {
    try {
      const data = await api.listSubmolts(page);
      const list = data.submolts ?? data ?? [];
      if (!Array.isArray(list) || list.length === 0) break;
      for (const s of list) names.push(s.name);
      if (list.length < 100) break;
    } catch {
      break;
    }
  }
  submoltNameCache = [...new Set(names)];
  submoltCacheTime = Date.now();
  return submoltNameCache;
}

export async function handleSubmolts(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);
  const isFragment = url.searchParams.has("_fragment");

  // GET /submolts/search?q=... — typeahead for submolt names
  if (path === "/submolts/search" && req.method === "GET") {
    const q = (url.searchParams.get("q") ?? url.searchParams.get("submolt") ?? "").toLowerCase();
    if (q.length < 1) {
      return new Response("", { headers: { "Content-Type": "text/html" } });
    }
    const names = await getSubmoltNames();
    const matches = names
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 15)
      .map(n => `<option value="${esc(n)}">`).join("");
    return new Response(matches, { headers: { "Content-Type": "text/html" } });
  }

  // GET /submolts
  if (path === "/submolts" && req.method === "GET") {
    const sort = url.searchParams.get("sort") ?? "recent";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const query = (url.searchParams.get("q") ?? "").trim();

    if (!isFragment && !isHtmx(req)) {
      const params = new URLSearchParams({ _fragment: "1", sort });
      if (page > 1) params.set("page", String(page));
      if (query) params.set("q", query);
      return new Response(layout("Submolts", loadingPlaceholder(`/submolts?${params}`)), { headers: { "Content-Type": "text/html" } });
    }

    let submolts: any[] = [];
    let errorToast: { type: "error"; message: string } | undefined;

    if (query) {
      // Search mode: filter from the full cached name list, then fetch details
      try {
        const names = await getSubmoltNames();
        const q = query.toLowerCase();
        const matched = names.filter(n => n.toLowerCase().includes(q));
        // Return lightweight results without fetching each submolt's full data
        submolts = matched.map(n => ({ name: n, description: "", subscriber_count: null }));
      } catch (e: any) {
        errorToast = { type: "error", message: `Search failed: ${e.message}` };
      }
    } else {
      // Normal paginated listing
      try {
        const data = await api.listSubmolts(page);
        submolts = data.submolts ?? data ?? [];
      } catch (e: any) {
        errorToast = { type: "error", message: `Could not load submolts: ${e.message}` };
      }
    }

    if (sort === "alpha") {
      submolts.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    } else if (sort === "subscribers") {
      submolts.sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0));
    }

    const body = submoltsListPage(submolts, sort, query ? 1 : page, query);
    return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
  }

  // GET /submolts/new
  if (path === "/submolts/new" && req.method === "GET") {
    const body = createSubmoltPage();
    return new Response(layout("Create Submolt", body), { headers: { "Content-Type": "text/html" } });
  }

  // POST /submolts — create
  if (path === "/submolts" && req.method === "POST") {
    try {
      const form = await req.formData();
      const name = form.get("name")?.toString().trim() ?? "";
      const description = form.get("description")?.toString().trim() || undefined;
      if (!name) {
        return new Response(layout("Create Submolt", `<div class="toast toast-error">Name required</div>` + createSubmoltPage()), { headers: { "Content-Type": "text/html" } });
      }
      await api.createSubmolt({ name, description });
      logAction("create_submolt", name);
      return Response.redirect(`/s/${name}`, 303);
    } catch (e: any) {
      return new Response(layout("Create Submolt", `<div class="toast toast-error">${e.message}</div>` + createSubmoltPage()), { headers: { "Content-Type": "text/html" } });
    }
  }

  // GET /s/:name
  const submoltMatch = path.match(/^\/s\/([^/]+)$/);
  if (submoltMatch && req.method === "GET") {
    const name = decodeURIComponent(submoltMatch[1]);

    if (!isFragment && !isHtmx(req)) {
      return new Response(layout(name, loadingPlaceholder(`/s/${encodeURIComponent(name)}?_fragment=1`)), { headers: { "Content-Type": "text/html" } });
    }

    try {
      const submolt = await api.getSubmolt(name);
      let posts: any[] = [];
      let feedError: { type: "error"; message: string } | undefined;
      try {
        const fdata = await api.getSubmoltFeed(name);
        posts = fdata.posts ?? fdata ?? [];
        for (const p of posts) cachePost(p);
      } catch (e: any) {
        feedError = { type: "error", message: `Could not load submolt feed: ${e.message}` };
      }
      // TODO: determine subscription status — for now default false
      const body = submoltDetailPage(submolt.submolt ?? submolt, posts, false);
      return new Response(partial(body, feedError), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      const errorHtml = `<p>Could not load submolt: ${e.message}</p>`;
      return new Response(partial(errorHtml, { type: "error", message: `Could not load submolt: ${e.message}` }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /s/:name/subscribe
  const subMatch = path.match(/^\/s\/([^/]+)\/subscribe$/);
  if (subMatch && req.method === "POST") {
    const name = decodeURIComponent(subMatch[1]);
    try {
      await api.subscribeSubmolt(name);
      logAction("subscribe", name);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Subscribed to ${name}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect(`/s/${name}`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /s/:name/unsubscribe
  const unsubMatch = path.match(/^\/s\/([^/]+)\/unsubscribe$/);
  if (unsubMatch && req.method === "POST") {
    const name = decodeURIComponent(unsubMatch[1]);
    try {
      await api.unsubscribeSubmolt(name);
      logAction("unsubscribe", name);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Unsubscribed from ${name}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect(`/s/${name}`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  return null;
}
