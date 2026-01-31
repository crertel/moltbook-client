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

  if (!isFragment && !isHtmx(req)) {
    return new Response(layout("Moltys", loadingPlaceholder("/moltys?_fragment=1")), { headers: { "Content-Type": "text/html" } });
  }

  let agents: any[] = [];
  let errorToast: { type: "error"; message: string } | undefined;
  try {
    const data = await api.listRecentAgents();
    agents = data.agents ?? data ?? [];
  } catch (e: any) {
    errorToast = { type: "error", message: `Could not load moltys: ${e.message}` };
  }

  const body = moltysListPage(agents);
  return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
}
