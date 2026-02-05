import { layout, partial, esc, loadingPlaceholder } from "../templates/layout";
import { moltysListPage } from "../templates/moltys";
import * as api from "../api";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

// In-memory cache for agent names (for typeahead)
let agentNameCache: string[] = [];
let agentCacheTime = 0;
const AGENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAgentNames(): Promise<string[]> {
  if (Date.now() - agentCacheTime < AGENT_CACHE_TTL && agentNameCache.length > 0) {
    return agentNameCache;
  }
  try {
    const data = await api.listRecentAgents(200);
    const agents = data.agents ?? data ?? [];
    agentNameCache = [...new Set<string>(agents.map((a: any) => a.name).filter(Boolean))];
    agentCacheTime = Date.now();
  } catch {
    // keep stale cache on error
  }
  return agentNameCache;
}

export { getAgentNames };

export async function handleMoltys(req: Request, path: string): Promise<Response | null> {
  // GET /agents/search?q=... — typeahead for agent names
  if (path === "/agents/search" && req.method === "GET") {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? url.searchParams.get("agent") ?? "").toLowerCase();
    if (q.length < 1) {
      return new Response("", { headers: { "Content-Type": "text/html" } });
    }
    const names = await getAgentNames();
    const matches = names
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 15)
      .map(n => `<option value="${esc(n)}">`).join("");
    return new Response(matches, { headers: { "Content-Type": "text/html" } });
  }

  if (path !== "/moltys" || req.method !== "GET") return null;

  const url = new URL(req.url);
  const isFragment = url.searchParams.has("_fragment");

  const sort = url.searchParams.get("sort") ?? "recent";

  if (!isFragment && !isHtmx(req)) {
    return new Response(layout("Moltys", loadingPlaceholder(`/moltys?_fragment=1&sort=${sort}`)), { headers: { "Content-Type": "text/html" } });
  }

  let agents: any[] = [];
  let errorToast: { type: "error"; message: string } | undefined;
  try {
    const data = await api.listRecentAgents();
    agents = data.agents ?? data ?? [];
  } catch (e: any) {
    errorToast = { type: "error", message: `Could not load moltys: ${e.message}` };
  }

  if (sort === "alpha") {
    agents.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  } else if (sort === "karma") {
    agents.sort((a, b) => (b.karma ?? 0) - (a.karma ?? 0));
  } else if (sort === "followers") {
    agents.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
  }

  const body = moltysListPage(agents, sort);
  return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
}
