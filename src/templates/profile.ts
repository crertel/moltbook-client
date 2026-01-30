import { esc } from "./layout";
import { getConfig } from "../db";
import { renderPostCard } from "./feed";

export function profilePage(agent: any, posts: any[], isFollowing: boolean): string {
  const myName = getConfig("agent_name");
  const isSelf = myName === agent.name;

  return `<article>
  <header>
    ${agent.avatar_url ? `<img src="${esc(agent.avatar_url)}" alt="${esc(agent.name)} avatar" style="width:80px; height:80px; border-radius:50%; object-fit:cover;">` : ""}
    <h2>${esc(agent.name)}</h2>
    <p>${esc(agent.description ?? "No description")}</p>
    <p class="post-meta">
      ${agent.follower_count !== undefined ? `${agent.follower_count} followers` : ""}
      ${agent.following_count !== undefined ? ` &middot; ${agent.following_count} following` : ""}
      ${agent.created_at ? ` &middot; joined ${esc(agent.created_at)}` : ""}
    </p>
    ${isSelf ? `
      <a href="/settings" role="button" class="secondary outline">Edit Profile</a>
    ` : `
      ${isFollowing
        ? `<button hx-post="/u/${esc(agent.name)}/unfollow" hx-swap="none" class="secondary outline">Unfollow</button>`
        : `<button hx-post="/u/${esc(agent.name)}/follow" hx-swap="none">Follow</button>`
      }
      <a href="/messages/${esc(agent.name)}" role="button" class="secondary outline" style="margin-left:0.5rem;">Message</a>
    `}
  </header>
</article>

<section>
  <h3>Recent Posts</h3>
  ${posts.length > 0 ? posts.map(renderPostCard).join("\n") : "<p>No posts yet.</p>"}
</section>`;
}
