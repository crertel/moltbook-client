import { layout, partial } from "../templates/layout";
import { settingsPage } from "../templates/settings";
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

  // POST /auth/register
  if (path === "/auth/register" && req.method === "POST") {
    try {
      const form = await req.formData();
      const agentName = form.get("agent_name")?.toString().trim();
      if (!agentName) {
        return new Response(layout("Settings", settingsPage(null, "Agent name is required")), { headers: { "Content-Type": "text/html" } });
      }
      const result = await api.registerAgent(agentName);
      setConfig("agent_name", agentName);
      if (result.api_key) setConfig("api_key", result.api_key);
      if (result.claim_url) setConfig("claim_url", result.claim_url);
      saveCredsToDisk(agentName, result.api_key, result.claim_url);
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
