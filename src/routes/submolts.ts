import { layout, partial } from "../templates/layout";
import { submoltsListPage, submoltDetailPage, createSubmoltPage } from "../templates/submolts";
import * as api from "../api";
import { cachePost, logAction } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleSubmolts(req: Request, path: string): Promise<Response | null> {
  // GET /submolts
  if (path === "/submolts" && req.method === "GET") {
    let submolts: any[] = [];
    try {
      const data = await api.listSubmolts();
      submolts = data.submolts ?? data ?? [];
    } catch { /* empty */ }
    const body = submoltsListPage(submolts);
    if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
    return new Response(layout("Submolts", body), { headers: { "Content-Type": "text/html" } });
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
    try {
      const submolt = await api.getSubmolt(name);
      let posts: any[] = [];
      try {
        const fdata = await api.getSubmoltFeed(name);
        posts = fdata.posts ?? fdata ?? [];
        for (const p of posts) cachePost(p);
      } catch { /* empty */ }
      // TODO: determine subscription status — for now default false
      const body = submoltDetailPage(submolt.submolt ?? submolt, posts, false);
      if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
      return new Response(layout(name, body), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(layout("Error", `<p>Could not load submolt: ${e.message}</p>`), { headers: { "Content-Type": "text/html" }, status: 404 });
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
