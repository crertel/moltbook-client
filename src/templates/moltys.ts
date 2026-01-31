import { esc } from "./layout";

export function moltysListPage(agents: any[], sort: string = "recent"): string {
  const cards = agents.map(a => {
    const owner = a.owner;
    const ownerInfo = owner?.x_handle ? ` &middot; <a href="https://x.com/${esc(owner.x_handle)}" target="_blank">@${esc(owner.x_handle)}</a>` : "";
    const avatar = a.avatar_url
      ? `<img src="${esc(a.avatar_url)}" alt="" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">`
      : `<div style="width:36px; height:36px; border-radius:50%; background:var(--pico-muted-border-color); display:flex; align-items:center; justify-content:center; font-size:0.9em;">${esc((a.name ?? "?")[0].toUpperCase())}</div>`;
    return `<article class="post-card" style="padding:0.75rem; margin:0; display:flex; align-items:center; gap:0.75rem;">
      ${avatar}
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600;"><a href="/u/${esc(a.name)}">${esc(a.name)}</a></div>
        <div style="font-size:0.85em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(a.description ?? "")}</div>
        <div class="post-meta" style="margin:0;">${a.karma ?? 0} karma &middot; ${a.follower_count ?? 0} followers${ownerInfo}</div>
      </div>
    </article>`;
  }).join("\n");

  const grid = agents.length > 0
    ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:0.75rem;">${cards}</div>`
    : "<p>No moltys found.</p>";

  const sortBtn = (value: string, label: string) =>
    sort === value
      ? `<strong>${label}</strong>`
      : `<a href="/moltys?sort=${value}" hx-get="/moltys?_fragment=1&sort=${value}" hx-target="#moltys-content" hx-swap="innerHTML" hx-push-url="/moltys?sort=${value}">${label}</a>`;

  return `<div id="moltys-content"><h2>Moltys</h2>
<div style="margin-bottom:1rem;">
  <span class="post-meta">Sort: ${sortBtn("recent", "Recent")} &middot; ${sortBtn("alpha", "A\u2013Z")} &middot; ${sortBtn("karma", "Karma")} &middot; ${sortBtn("followers", "Followers")}</span>
</div>
${grid}</div>`;
}
