import { layout, partial, esc, loadingPlaceholder } from "../templates/layout";
import { messagesPage, conversationPage } from "../templates/messages";
import * as api from "../api";
import { cacheConversation, logAction } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleMessages(req: Request, path: string): Promise<Response | null> {
  const url = new URL(req.url);
  const isFragment = url.searchParams.has("_fragment");

  // GET /messages
  if (path === "/messages" && req.method === "GET") {
    if (!isFragment && !isHtmx(req)) {
      return new Response(layout("Messages", loadingPlaceholder("/messages?_fragment=1")), { headers: { "Content-Type": "text/html" } });
    }

    let conversations: any[] = [];
    let requests: any[] = [];
    const errors: string[] = [];
    try {
      const dmData = await api.listConversations();
      const convos = dmData.conversations;
      conversations = Array.isArray(convos) ? convos : (convos?.items ?? []);
      for (const c of conversations) cacheConversation(c);
    } catch (e: any) {
      errors.push(`Could not load conversations: ${e.message}`);
    }
    try {
      const reqData = await api.getDMRequests();
      const incoming = reqData.incoming?.requests ?? [];
      const outgoing = reqData.outgoing?.requests ?? [];
      requests = [...incoming, ...outgoing];
    } catch (e: any) {
      errors.push(`Could not load DM requests: ${e.message}`);
    }
    const errorToast = errors.length ? { type: "error" as const, message: errors.join("; ") } : undefined;
    const body = messagesPage(conversations, requests);
    return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
  }

  // GET /messages/new?agent=xxx — redirect to conversation
  if (path === "/messages/new" && req.method === "GET") {
    const agent = url.searchParams.get("agent")?.trim();
    if (agent) return Response.redirect(`/messages/${encodeURIComponent(agent)}`, 303);
    return Response.redirect("/messages", 303);
  }

  // GET /messages/:agent
  const convMatch = path.match(/^\/messages\/([^/]+)$/);
  if (convMatch && req.method === "GET") {
    const agentName = decodeURIComponent(convMatch[1]);

    if (!isFragment && !isHtmx(req)) {
      return new Response(layout(`Chat with ${agentName}`, loadingPlaceholder(`/messages/${encodeURIComponent(agentName)}?_fragment=1`)), { headers: { "Content-Type": "text/html" } });
    }

    let messages: any[] = [];
    let errorToast: { type: "error"; message: string } | undefined;
    try {
      const data = await api.getConversation(agentName);
      messages = data.messages ?? data ?? [];
    } catch (e: any) {
      errorToast = { type: "error", message: `Could not load messages: ${e.message}` };
    }
    const body = conversationPage(agentName, messages);
    return new Response(partial(body, errorToast), { headers: { "Content-Type": "text/html" } });
  }

  // POST /messages/:agent/send
  const sendMatch = path.match(/^\/messages\/([^/]+)\/send$/);
  if (sendMatch && req.method === "POST") {
    const agentName = decodeURIComponent(sendMatch[1]);
    try {
      const form = await req.formData();
      const content = form.get("content")?.toString().trim() ?? "";
      if (!content) {
        return new Response(partial("", { type: "error", message: "Message cannot be empty" }), { headers: { "Content-Type": "text/html" } });
      }
      await api.sendDM(agentName, content);
      logAction("send_dm", agentName, content.substring(0, 100));

      // Return the new message bubble for HTMX append
      if (isHtmx(req)) {
        const bubble = `<div style="margin-bottom:0.75rem; text-align:right;">
          <div style="display:inline-block; max-width:75%; padding:0.5rem 1rem; border-radius:12px; background:var(--pico-primary-background); color:var(--pico-primary-inverse);">
            <p style="margin:0;">${esc(content)}</p>
            <small class="post-meta">just now</small>
          </div>
        </div>`;
        return new Response(bubble, { headers: { "Content-Type": "text/html" } });
      }
      return Response.redirect(`/messages/${encodeURIComponent(agentName)}`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /messages/requests/:agent/approve
  const approveMatch = path.match(/^\/messages\/requests\/([^/]+)\/approve$/);
  if (approveMatch && req.method === "POST") {
    const agentName = decodeURIComponent(approveMatch[1]);
    try {
      await api.approveDMRequest(agentName);
      logAction("approve_dm", agentName);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Approved ${agentName}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect("/messages", 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /messages/requests/:agent/reject
  const rejectMatch = path.match(/^\/messages\/requests\/([^/]+)\/reject$/);
  if (rejectMatch && req.method === "POST") {
    const agentName = decodeURIComponent(rejectMatch[1]);
    try {
      await api.rejectDMRequest(agentName);
      logAction("reject_dm", agentName);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Rejected ${agentName}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect("/messages", 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  return null;
}
