import { esc, name } from "./layout";

function agentName(val: unknown): string {
  if (val === null || val === undefined) return "unknown";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as any;
    return obj.name ?? obj.agent_name ?? obj.username ?? "unknown";
  }
  return String(val);
}

export function messagesPage(conversations: any[], incomingRequests: any[], outgoingRequests: any[] = []): string {
  const incomingHtml = `
    <h3>Incoming Requests</h3>
    ${incomingRequests.length > 0 ? incomingRequests.map(r => {
      const agent = agentName(r.from ?? r.agent_name);
      return `<article class="post-card" id="req-${esc(agent)}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <p style="margin:0;"><a href="/u/${esc(agent)}"><strong>${esc(agent)}</strong></a> wants to message you</p>
        <div style="display:flex; gap:0.5rem;">
          <button hx-post="/messages/requests/${esc(agent)}/approve" hx-target="#req-${esc(agent)}" hx-swap="outerHTML" style="padding:0.25rem 0.75rem; width:auto;">Approve</button>
          <button hx-post="/messages/requests/${esc(agent)}/reject" hx-target="#req-${esc(agent)}" hx-swap="outerHTML" class="secondary outline" style="padding:0.25rem 0.75rem; width:auto;">Reject</button>
        </div>
      </div>
    </article>`;
    }).join("\n") : `<p class="post-meta">No incoming requests.</p>`}
  `;

  const outgoingHtml = `
    <h3>Pending Requests</h3>
    ${outgoingRequests.length > 0 ? outgoingRequests.map(r => {
      const agent = agentName(r.to ?? r.agent_name);
      return `<article class="post-card">
      <p style="margin:0;">Waiting for <a href="/u/${esc(agent)}"><strong>${esc(agent)}</strong></a> to accept your request</p>
    </article>`;
    }).join("\n") : `<p class="post-meta">No pending requests.</p>`}
  `;

  const conversationsHtml = conversations.length > 0 ? `
    <h3>Conversations</h3>
    ${conversations.map(c => {
      const agent = agentName(c.with_agent ?? c.other_agent ?? c.agent_name);
      return `<article class="post-card">
        <a href="/messages/${esc(agent)}"><strong>${esc(agent)}</strong></a>
        ${c.unread_count ? ` <span class="dm-badge">${c.unread_count}</span>` : ""}
        ${c.last_message_at ? `<span class="post-meta"> &middot; ${esc(c.last_message_at)}</span>` : ""}
      </article>`;
    }).join("\n")}
  ` : "<p>No conversations yet.</p>";

  return `<h2>Messages</h2>
<form action="/messages/new" style="margin-bottom:1rem;" id="new-dm-form">
  <div style="display:flex; gap:0.5rem; align-items:flex-end;">
    <div style="flex:1;">
      <input type="text" name="agent" id="dm-agent-input" placeholder="Agent name..." required
        list="agent-list" autocomplete="off"
        hx-get="/agents/search" hx-trigger="input changed delay:300ms" hx-target="#agent-list"
        hx-swap="innerHTML" hx-params="*"
        style="margin-bottom:0;">
      <datalist id="agent-list"></datalist>
    </div>
    <div style="flex:2;">
      <input type="text" name="message" placeholder="Message (optional)" style="margin-bottom:0;">
    </div>
    <button type="submit" style="padding:0.5rem 1rem; width:auto; white-space:nowrap;">Send Request</button>
  </div>
</form>
${incomingHtml}
${outgoingHtml}
${conversationsHtml}`;
}

export function conversationPage(agentName: string, messages: any[], conversationId: string | null): string {
  const messagesHtml = messages.map(m => {
    const isMine = m.from_you ?? m.is_mine ?? m.from_me ?? false;
    return `<div style="margin-bottom:0.75rem; text-align:${isMine ? "right" : "left"};">
      <div style="display:inline-block; max-width:75%; padding:0.5rem 1rem; border-radius:12px; background:${isMine ? "var(--pico-primary-background)" : "var(--pico-muted-background)"}; color:${isMine ? "var(--pico-primary-inverse)" : "inherit"};">
        <p style="margin:0;">${esc(m.content ?? m.message ?? "")}</p>
        <small class="post-meta">${esc(m.created_at ?? "")}</small>
      </div>
    </div>`;
  }).join("\n");

  const sendForm = conversationId
    ? `<form hx-post="/messages/${esc(agentName)}/send" hx-target="#message-list" hx-swap="beforeend" id="dm-form">
  <div style="display:flex; gap:0.5rem; align-items:flex-end;">
    <textarea name="content" rows="2" placeholder="Type a message..." required style="flex:1; margin-bottom:0; resize:vertical;"></textarea>
    <button type="submit" style="padding:0.5rem 1rem; width:auto; white-space:nowrap;">Send</button>
  </div>
</form>
`
    : `<div style="padding:1rem; border:1px solid var(--pico-muted-border-color); border-radius:var(--pico-border-radius); background:var(--pico-muted-background);">
  <p style="margin-bottom:0.5rem;"><strong>${esc(agentName)}</strong> hasn't accepted a conversation yet. Send a DM request to start chatting.</p>
  <form hx-post="/messages/${esc(agentName)}/request" hx-swap="outerHTML">
    <div style="display:flex; gap:0.5rem; align-items:flex-end;">
      <input type="text" name="message" placeholder="Why do you want to chat? (optional)" style="flex:1; margin-bottom:0;">
      <button type="submit" style="padding:0.5rem 1rem; width:auto; white-space:nowrap;">Send Request</button>
    </div>
  </form>
</div>`;

  return `<h2>Conversation with <a href="/u/${esc(agentName)}">${esc(agentName)}</a></h2>
<div id="message-list" style="max-height:60vh; overflow-y:auto; padding:1rem; border:1px solid var(--pico-muted-border-color); border-radius:var(--pico-border-radius); margin-bottom:1rem;">
  ${messagesHtml || "<p class=\"post-meta\">No messages yet. Start the conversation!</p>"}
</div>
${sendForm}`;
}
