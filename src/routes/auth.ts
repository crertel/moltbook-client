import { layout, partial } from "../templates/layout";
import { settingsPage, diagnosticsResults } from "../templates/settings";
import { setConfig, deleteConfig, getConfig, logAction } from "../db";
import * as api from "../api";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CREDS_DIR = join(homedir(), ".config", "moltbook");
const CREDS_FILE = join(CREDS_DIR, "credentials.json");

function saveCredsToDisk(agentName: string, apiKey: string, claimUrl?: string) {
  mkdirSync(CREDS_DIR, { recursive: true });
  writeFileSync(CREDS_FILE, JSON.stringify({ agent_name: agentName, api_key: apiKey, claim_url: claimUrl }, null, 2));
}

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleAuth(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);

  // GET /settings
  if (path === "/settings" && req.method === "GET") {
    let claimStatus: any = null;
    if (getConfig("api_key")) {
      try {
        claimStatus = await api.getClaimStatus();
      } catch { /* ignore */ }
    }
    const html = layout("Settings", settingsPage(claimStatus));
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  // GET /settings/diagnostics?_fragment=1 — run API health checks
  if (path === "/settings/diagnostics" && req.method === "GET") {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const checks: { name: string; endpoint: string; fn: () => Promise<any> }[] = [
      { name: "Global Feed", endpoint: "GET /posts?sort=hot", fn: () => api.getGlobalFeed() },
      { name: "Submolts List", endpoint: "GET /submolts", fn: () => api.listSubmolts() },
      { name: "Recent Agents", endpoint: "GET /agents/recent", fn: () => api.listRecentAgents(5) },
      { name: "Search", endpoint: "GET /search?q=test", fn: () => api.search("test") },
    ];

    if (getConfig("api_key")) {
      checks.push(
        { name: "Personalized Feed", endpoint: "GET /feed", fn: () => api.getPersonalizedFeed() },
        { name: "Agent Status", endpoint: "GET /agents/status", fn: () => api.getClaimStatus() },
        { name: "My Profile", endpoint: "GET /agents/me", fn: () => api.getMyProfile() },
        { name: "DM Check", endpoint: "GET /agents/dm/check", fn: () => api.checkDMs() },
        { name: "Conversations", endpoint: "GET /agents/dm/conversations", fn: () => api.listConversations() },
        { name: "DM Requests", endpoint: "GET /agents/dm/requests", fn: () => api.getDMRequests() },
      );
    }

    const results: { name: string; endpoint: string; ok: boolean; ms: number; error?: string }[] = [];
    for (const check of checks) {
      const start = Date.now();
      try {
        await check.fn();
        results.push({ name: check.name, endpoint: check.endpoint, ok: true, ms: Date.now() - start });
      } catch (e: any) {
        results.push({ name: check.name, endpoint: check.endpoint, ok: false, ms: Date.now() - start, error: e.message });
      }
      await delay(200);
    }

    return new Response(diagnosticsResults(results), { headers: { "Content-Type": "text/html" } });
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
      saveCredsToDisk(agentName, agent.api_key, agent.claim_url);
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
      saveCredsToDisk(agentName, apiKey);
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
