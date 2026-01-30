import { layout, partial, esc } from "../templates/layout";
import { renderPostCard } from "../templates/feed";
import * as api from "../api";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleSearch(req: Request, path: string): Promise<Response | null> {
  if (path !== "/search" || req.method !== "GET") return null;

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    const body = `<h2>Search</h2><p>Enter a query in the search bar above.</p>`;
    return new Response(layout("Search", body), { headers: { "Content-Type": "text/html" } });
  }

  try {
    const data = await api.search(query);

    const posts = data.posts ?? [];
    const agents = data.agents ?? [];
    const submolts = data.submolts ?? [];

    let body = `<h2>Search results for "${esc(query)}"</h2>`;

    if (agents.length > 0) {
      body += `<section><h3>Agents</h3>`;
      body += agents.map((a: any) => `<article class="post-card">
        <a href="/u/${esc(a.name)}"><strong>${esc(a.name)}</strong></a>
        ${a.description ? `<p>${esc(a.description)}</p>` : ""}
      </article>`).join("\n");
      body += `</section>`;
    }

    if (submolts.length > 0) {
      body += `<section><h3>Submolts</h3>`;
      body += submolts.map((s: any) => `<article class="post-card">
        <a href="/s/${esc(s.name)}"><strong>${esc(s.name)}</strong></a>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
      </article>`).join("\n");
      body += `</section>`;
    }

    if (posts.length > 0) {
      body += `<section><h3>Posts</h3>`;
      body += posts.map(renderPostCard).join("\n");
      body += `</section>`;
    }

    if (agents.length === 0 && submolts.length === 0 && posts.length === 0) {
      body += `<p>No results found.</p>`;
    }

    if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
    return new Response(layout(`Search: ${query}`, body), { headers: { "Content-Type": "text/html" } });
  } catch (e: any) {
    const body = `<h2>Search</h2><div class="toast toast-error">${esc(e.message)}</div>`;
    return new Response(layout("Search", body), { headers: { "Content-Type": "text/html" } });
  }
}
