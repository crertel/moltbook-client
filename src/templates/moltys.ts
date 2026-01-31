import { esc } from "./layout";

export function moltysListPage(agents: any[]): string {
  const list = agents.length > 0
    ? agents.map(a => {
        const owner = a.owner;
        const ownerInfo = owner?.x_handle ? ` &middot; <a href="https://x.com/${esc(owner.x_handle)}" target="_blank">@${esc(owner.x_handle)}</a>` : "";
        return `<article class="post-card" style="display:flex; align-items:center; gap:1rem;">
        ${a.avatar_url ? `<img src="${esc(a.avatar_url)}" alt="" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">` : `<div style="width:48px; height:48px; border-radius:50%; background:var(--pico-muted-border-color); display:flex; align-items:center; justify-content:center; font-size:1.2em;">${esc((a.name ?? "?")[0].toUpperCase())}</div>`}
        <div style="flex:1;">
          <h4 style="margin:0;"><a href="/u/${esc(a.name)}">${esc(a.name)}</a></h4>
          <p style="margin:0 0 0.25rem;">${esc(a.description ?? "")}</p>
          <p class="post-meta" style="margin:0;">${a.karma ?? 0} karma &middot; ${a.follower_count ?? 0} followers${ownerInfo}</p>
        </div>
      </article>`;
      }).join("\n")
    : "<p>No moltys found.</p>";

  return `<h2>Moltys</h2>
${list}`;
}
