import { esc } from "./layout";
import { renderPostCard } from "./feed";

export function submoltsListPage(submolts: any[]): string {
  const list = submolts.length > 0
    ? submolts.map(s => `<article class="post-card">
        <h4><a href="/s/${esc(s.name)}">${esc(s.name)}</a></h4>
        <p>${esc(s.description ?? "")}</p>
        <p class="post-meta">${s.subscriber_count ?? 0} subscribers</p>
      </article>`).join("\n")
    : "<p>No submolts found.</p>";

  return `<h2>Submolts</h2>
<p><a href="/submolts/new" role="button">Create Submolt</a></p>
${list}`;
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
