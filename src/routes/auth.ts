import { layout, partial, loadingPlaceholder } from "../templates/layout";
import { settingsPage, diagnosticRowResult, getChecksForUser } from "../templates/settings";
import { setConfig, deleteConfig, getConfig, logAction } from "../db";
import * as api from "../api";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleAuth(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);

  // GET /settings
  if (path === "/settings" && req.method === "GET") {
    const isFragment = url.searchParams.has("_fragment");

    if (!isFragment && !isHtmx(req)) {
      return new Response(layout("Settings", loadingPlaceholder("/settings?_fragment=1")), { headers: { "Content-Type": "text/html" } });
    }

    let claimStatus: any = null;
    if (getConfig("api_key")) {
      try {
        claimStatus = await api.getClaimStatus();
      } catch { /* ignore */ }
    }
    return new Response(partial(settingsPage(claimStatus)), { headers: { "Content-Type": "text/html" } });
  }

  // GET /settings/diagnostics?i=N — run a single API health check
  if (path === "/settings/diagnostics" && req.method === "GET") {
    const checks = getChecksForUser();
    const index = Math.max(0, parseInt(url.searchParams.get("i") ?? "0", 10));
    const passed = parseInt(url.searchParams.get("passed") ?? "0", 10);
    const failed = parseInt(url.searchParams.get("failed") ?? "0", 10);

    if (index >= checks.length) {
      return new Response("", { headers: { "Content-Type": "text/html" } });
    }

    const check = checks[index];
    const fnMap: Record<string, () => Promise<any>> = {
      "GET /posts?sort=hot": () => api.getGlobalFeed(),
      "GET /submolts": () => api.listSubmolts(),
      "GET /agents/recent": () => api.listRecentAgents(5),
      "GET /search?q=test": () => api.search("test"),
      "GET /feed": () => api.getPersonalizedFeed(),
      "GET /agents/status": () => api.getClaimStatus(),
      "GET /agents/me": () => api.getMyProfile(),
      "GET /agents/dm/check": () => api.checkDMs(),
      "GET /agents/dm/conversations": () => api.listConversations(),
      "GET /agents/dm/requests": () => api.getDMRequests(),
    };

    const fn = fnMap[check.endpoint];
    let ok = false;
    let ms = 0;
    let error: string | undefined;

    const start = Date.now();
    try {
      await fn();
      ok = true;
      ms = Date.now() - start;
    } catch (e: any) {
      ms = Date.now() - start;
      error = e.message;
    }

    const newPassed = passed + (ok ? 1 : 0);
    const newFailed = failed + (ok ? 0 : 1);
    const isLast = index >= checks.length - 1;

    const nextName = !isLast ? checks[index + 1].name : undefined;
    const html = diagnosticRowResult(index, check, ok, ms, error, checks.length, newPassed, newFailed, isLast, nextName);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  // POST /auth/register
  if (path === "/auth/register" && req.method === "POST") {
    try {
      const form = await req.formData();
      const agentName = form.get("agent_name")?.toString().trim();
      const description = form.get("description")?.toString().trim();
      if (!agentName || !description) {
        return new Response(layout("Settings", settingsPage(null, "Agent name and description are required")), { headers: { "Content-Type": "text/html" } });
      }
      const result = await api.registerAgent(agentName, description);
      const agent = result.agent ?? result;
      setConfig("agent_name", agentName);
      if (agent.api_key) setConfig("api_key", agent.api_key);
      if (agent.claim_url) setConfig("claim_url", agent.claim_url);
      if (agent.verification_code) setConfig("verification_code", agent.verification_code);
      logAction("register", agentName);
      return Response.redirect("/settings", 303);
    } catch (e: any) {
      return new Response(layout("Settings", settingsPage(null, e.message)), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /auth/import
  if (path === "/auth/import" && req.method === "POST") {
    try {
      const form = await req.formData();
      const agentName = form.get("agent_name")?.toString().trim();
      const apiKey = form.get("api_key")?.toString().trim();
      if (!agentName || !apiKey) {
        return new Response(layout("Settings", settingsPage(null, "Both name and API key are required")), { headers: { "Content-Type": "text/html" } });
      }
      setConfig("agent_name", agentName);
      setConfig("api_key", apiKey);
      logAction("import_key", agentName);
      return Response.redirect("/settings", 303);
    } catch (e: any) {
      return new Response(layout("Settings", settingsPage(null, e.message)), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /auth/heartbeat
  if (path === "/auth/heartbeat" && req.method === "POST") {
    try {
      await api.heartbeat();
      logAction("heartbeat");
    } catch { /* ignore */ }
    return Response.redirect("/settings", 303);
  }

  // POST /auth/logout
  if (path === "/auth/logout" && req.method === "POST") {
    deleteConfig("api_key");
    deleteConfig("agent_name");
    deleteConfig("claim_url");
    return Response.redirect("/settings", 303);
  }

  return null;
}
