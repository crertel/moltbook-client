import { esc } from "./layout";

export function messagesPage(conversations: any[], requests: any[]): string {
  const requestsHtml = requests.length > 0 ? `
    <h3>Message Requests</h3>
    ${requests.map(r => `<article class="post-card">
      <p><strong>${esc(r.from ?? r.agent_name ?? "unknown")}</strong> wants to message you</p>
      <button hx-post="/messages/requests/${esc(r.from ?? r.agent_name)}/approve" hx-swap="none">Approve</button>
      <button hx-post="/messages/requests/${esc(r.from ?? r.agent_name)}/reject" hx-swap="none" class="secondary outline">Reject</button>
    </article>`).join("\n")}
  ` : "";

  const conversationsHtml = conversations.length > 0 ? `
    <h3>Conversations</h3>
    ${conversations.map(c => {
      const agent = c.with_agent ?? c.other_agent ?? c.agent_name ?? "unknown";
      return `<article class="post-card">
        <a href="/messages/${esc(agent)}"><strong>${esc(agent)}</strong></a>
        ${c.unread_count ? ` <span class="dm-badge">${c.unread_count}</span>` : ""}
        ${c.last_message_at ? `<span class="post-meta"> &middot; ${esc(c.last_message_at)}</span>` : ""}
      </article>`;
    }).join("\n")}
  ` : "<p>No conversations yet.</p>";

  return `<h2>Messages</h2>
<form action="/messages/new" style="margin-bottom:1rem;">
  <div style="display:flex; gap:0.5rem;">
    <input type="text" name="agent" placeholder="Agent name..." style="flex:1;">
    <button type="submit">New Message</button>
  </div>
</form>
${requestsHtml}
${conversationsHtml}`;
}

export function conversationPage(agentName: string, messages: any[]): string {
  const messagesHtml = messages.map(m => {
    const isMine = m.is_mine ?? m.from_me ?? false;
    return `<div style="margin-bottom:0.75rem; text-align:${isMine ? "right" : "left"};">
      <div style="display:inline-block; max-width:75%; padding:0.5rem 1rem; border-radius:12px; background:${isMine ? "var(--pico-primary-background)" : "var(--pico-muted-background)"}; color:${isMine ? "var(--pico-primary-inverse)" : "inherit"};">
        <p style="margin:0;">${esc(m.content)}</p>
        <small class="post-meta">${esc(m.created_at ?? "")}</small>
      </div>
    </div>`;
  }).join("\n");

  return `<h2>Conversation with <a href="/u/${esc(agentName)}">${esc(agentName)}</a></h2>
<div id="message-list" style="max-height:60vh; overflow-y:auto; padding:1rem; border:1px solid var(--pico-muted-border-color); border-radius:var(--pico-border-radius); margin-bottom:1rem;">
  ${messagesHtml || "<p>No messages yet. Start the conversation!</p>"}
</div>
<form hx-post="/messages/${esc(agentName)}/send" hx-target="#message-list" hx-swap="beforeend">
  <div style="display:flex; gap:0.5rem;">
    <textarea name="content" rows="2" placeholder="Type a message..." required style="flex:1;"></textarea>
    <button type="submit" style="align-self:flex-end;">Send</button>
  </div>
</form>`;
}
