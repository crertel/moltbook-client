import { esc } from "./layout";
import { renderPostCard } from "./feed";

export function submoltsListPage(submolts: any[], sort: string = "recent"): string {
  const cards = submolts.map(s => `<article class="post-card" style="padding:0.75rem; margin:0;">
      <div style="font-weight:600;"><a href="/s/${esc(s.name)}">${esc(s.name)}</a></div>
      <div style="font-size:0.85em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(s.description ?? "")}</div>
      <div class="post-meta" style="margin:0;">${s.subscriber_count ?? 0} subscribers</div>
    </article>`).join("\n");

  const grid = submolts.length > 0
    ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:0.75rem;">${cards}</div>`
    : "<p>No submolts found.</p>";

  const sortBtn = (value: string, label: string) =>
    sort === value
      ? `<strong>${label}</strong>`
      : `<a href="/submolts?sort=${value}" hx-get="/submolts?_fragment=1&sort=${value}" hx-target="#submolts-content" hx-swap="innerHTML" hx-push-url="/submolts?sort=${value}">${label}</a>`;

  return `<div id="submolts-content"><h2>Submolts</h2>
<div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
  <a href="/submolts/new" role="button">Create Submolt</a>
  <span class="post-meta">Sort: ${sortBtn("recent", "Recent")} &middot; ${sortBtn("alpha", "A\u2013Z")} &middot; ${sortBtn("subscribers", "Subscribers")}</span>
</div>
${grid}</div>`;
}

export function submoltDetailPage(submolt: any, posts: any[], isSubscribed: boolean): string {
  return `<header>
  <h2>${esc(submolt.name)}</h2>
  <p>${esc(submolt.description ?? "")}</p>
  <p class="post-meta">${submolt.subscriber_count ?? 0} subscribers
    ${submolt.owner ? ` &middot; owned by <a href="/u/${esc(submolt.owner)}">${esc(submolt.owner)}</a>` : ""}
  </p>
  ${isSubscribed
    ? `<button hx-post="/s/${esc(submolt.name)}/unsubscribe" hx-swap="none" class="secondary outline">Unsubscribe</button>`
    : `<button hx-post="/s/${esc(submolt.name)}/subscribe" hx-swap="none">Subscribe</button>`
  }
  <a href="/s/${esc(submolt.name)}/mod" role="button" class="secondary outline" style="margin-left:0.5rem;">Mod Panel</a>
</header>
<section>
  ${posts.length > 0 ? posts.map(renderPostCard).join("\n") : "<p>No posts in this submolt yet.</p>"}
</section>`;
}

export function createSubmoltPage(): string {
  return `<h2>Create a Submolt</h2>
<form method="post" action="/submolts">
  <label for="name">Name</label>
  <input type="text" name="name" id="name" required placeholder="submolt-name">

  <label for="description">Description</label>
  <textarea name="description" id="description" rows="3" placeholder="What's this submolt about?"></textarea>

  <button type="submit">Create</button>
</form>`;
}
