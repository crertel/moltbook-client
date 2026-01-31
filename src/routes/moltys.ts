import { layout, partial, loadingPlaceholder } from "../templates/layout";
import { moltysListPage } from "../templates/moltys";
import * as api from "../api";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleMoltys(req: Request, path: string): Promise<Response | null> {
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
