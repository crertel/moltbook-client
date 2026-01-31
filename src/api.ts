import { getConfig } from "./db";

const BASE_URL = "https://www.moltbook.com/api/v1";

function getApiKey(): string | null {
  return getConfig("api_key");
}

function getAgentName(): string | null {
  return getConfig("agent_name");
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("Request timed out — Moltbook may be slow. Try again.");
    }
    throw err;
  }
}

async function apiGet(path: string) {
  const res = await apiFetch(path);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const res = await apiFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPatch(path: string, body?: unknown) {
  const res = await apiFetch(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API PATCH ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiDelete(path: string) {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API DELETE ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Auth / Registration ──

export async function registerAgent(name: string, description: string) {
  return apiPost("/agents/register", { name, description });
}

export async function getClaimStatus() {
  return apiGet("/agents/status");
}

export async function heartbeat() {
  return apiPost("/agents/heartbeat");
}

// ── Feed ──

export async function getPersonalizedFeed(page = 1) {
  return apiGet(`/feed?page=${page}`);
}

export async function getGlobalFeed(page = 1) {
  return apiGet(`/posts?sort=hot&page=${page}`);
}

export async function getSubmoltFeed(submolt: string, page = 1) {
  return apiGet(`/submolts/${encodeURIComponent(submolt)}/feed?sort=new&page=${page}`);
}

// ── Posts ──

export async function getPost(id: string) {
  return apiGet(`/posts/${encodeURIComponent(id)}`);
}

export async function createPost(data: { title: string; content?: string; url?: string; submolt?: string }) {
  return apiPost("/posts", data);
}

export async function deletePost(id: string) {
  return apiDelete(`/posts/${encodeURIComponent(id)}`);
}

export async function upvotePost(id: string) {
  return apiPost(`/posts/${encodeURIComponent(id)}/upvote`);
}

export async function downvotePost(id: string) {
  return apiPost(`/posts/${encodeURIComponent(id)}/downvote`);
}

// ── Comments ──

export async function getComments(postId: string) {
  return apiGet(`/posts/${encodeURIComponent(postId)}/comments`);
}

export async function createComment(postId: string, data: { content: string; parent_id?: string }) {
  return apiPost(`/posts/${encodeURIComponent(postId)}/comments`, data);
}

export async function upvoteComment(commentId: string) {
  return apiPost(`/comments/${encodeURIComponent(commentId)}/upvote`);
}

// ── Submolts ──

export async function listSubmolts(page = 1) {
  return apiGet(`/submolts?page=${page}`);
}

export async function getSubmolt(name: string) {
  return apiGet(`/submolts/${encodeURIComponent(name)}`);
}

export async function createSubmolt(data: { name: string; description?: string }) {
  return apiPost("/submolts", data);
}

export async function updateSubmolt(name: string, data: { description?: string }) {
  return apiPatch(`/submolts/${encodeURIComponent(name)}`, data);
}

export async function subscribeSubmolt(name: string) {
  return apiPost(`/submolts/${encodeURIComponent(name)}/subscribe`);
}

export async function unsubscribeSubmolt(name: string) {
  return apiDelete(`/submolts/${encodeURIComponent(name)}/subscribe`);
}

// ── Agents ──

export async function listRecentAgents(limit = 50) {
  return apiGet(`/agents/recent?limit=${limit}&sort=recent`);
}

// ── Profiles ──

export async function getProfile(name: string) {
  return apiGet(`/agents/profile?name=${encodeURIComponent(name)}`);
}

export async function getMyProfile() {
  return apiGet("/agents/me");
}

export async function updateProfile(data: { description?: string }) {
  return apiPatch("/agents/me", data);
}

export async function uploadAvatar(file: Blob) {
  const apiKey = getApiKey();
  const formData = new FormData();
  formData.append("avatar", file);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/agents/me/avatar`, {
      method: "POST",
      headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
      body: formData,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("Request timed out — Moltbook may be slow. Try again.");
    }
    throw err;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Avatar upload failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function followAgent(name: string) {
  return apiPost(`/agents/${encodeURIComponent(name)}/follow`);
}

export async function unfollowAgent(name: string) {
  return apiDelete(`/agents/${encodeURIComponent(name)}/follow`);
}

// ── DMs ──

export async function checkDMs() {
  return apiGet("/agents/dm/check");
}

export async function getDMRequests() {
  return apiGet("/agents/dm/requests");
}

export async function listConversations() {
  return apiGet("/agents/dm/conversations");
}

export async function approveDMRequest(id: string) {
  return apiPost(`/agents/dm/requests/${encodeURIComponent(id)}/approve`);
}

export async function rejectDMRequest(id: string) {
  return apiPost(`/agents/dm/requests/${encodeURIComponent(id)}/reject`);
}

export async function getConversation(id: string) {
  return apiGet(`/agents/dm/conversations/${encodeURIComponent(id)}`);
}

export async function sendDM(conversationId: string, message: string) {
  return apiPost(`/agents/dm/conversations/${encodeURIComponent(conversationId)}/send`, { message });
}

export async function requestDM(toAgent: string, message: string) {
  return apiPost("/agents/dm/request", { to: toAgent, message });
}

function extractName(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const obj = val as any;
    return obj.name ?? obj.agent_name ?? obj.username ?? "";
  }
  return String(val);
}

export async function findConversationByAgent(agentName: string): Promise<any | null> {
  const data = await listConversations();
  const convos = data.conversations;
  const list = Array.isArray(convos) ? convos : (convos?.items ?? []);
  return list.find((c: any) => extractName(c.with_agent ?? c.other_agent).toLowerCase() === agentName.toLowerCase()) ?? null;
}

// ── Moderation ──

export async function pinPost(submolt: string, postId: string) {
  return apiPost(`/submolts/${encodeURIComponent(submolt)}/pin/${encodeURIComponent(postId)}`);
}

export async function unpinPost(submolt: string, postId: string) {
  return apiPost(`/submolts/${encodeURIComponent(submolt)}/unpin/${encodeURIComponent(postId)}`);
}

export async function addModerator(submolt: string, agentName: string) {
  return apiPost(`/submolts/${encodeURIComponent(submolt)}/moderators`, { agent_name: agentName });
}

export async function removeModerator(submolt: string, agentName: string) {
  return apiDelete(`/submolts/${encodeURIComponent(submolt)}/moderators/${encodeURIComponent(agentName)}`);
}

// ── Search ──

export async function search(query: string) {
  return apiGet(`/search?q=${encodeURIComponent(query)}`);
}
