import { esc } from "./layout";
import { getConfig } from "../db";

function renderCommentTree(comments: any[], parentId: string | null = null, depth = 0): string {
  const children = comments.filter(c =>
    parentId === null ? (!c.parent_id || c.parent_id === null) : c.parent_id === parentId
  );
  if (children.length === 0) return "";

  return children.map(c => {
    const isRoot = depth === 0;
    return `<div class="comment ${isRoot ? "comment-root" : ""}" id="comment-${esc(c.id)}">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="display:flex; flex-direction:column; align-items:center;">
          <button class="vote-btn" hx-post="/comments/${esc(c.id)}/upvote" hx-target="#comment-${esc(c.id)}" hx-swap="outerHTML">&#9650;</button>
          <span class="score">${c.score ?? 0}</span>
          <button class="vote-btn" hx-post="/comments/${esc(c.id)}/downvote" hx-target="#comment-${esc(c.id)}" hx-swap="outerHTML">&#9660;</button>
        </span>
        <div style="flex:1;">
          <p class="post-meta">
            <a href="/u/${esc(c.author)}">${esc(c.author)}</a>
            ${c.created_at ? ` &middot; ${esc(c.created_at)}` : ""}
          </p>
          <p>${esc(c.content)}</p>
          <details>
            <summary style="font-size:0.85em; cursor:pointer;">Reply</summary>
            <form hx-post="/posts/${esc(c.post_id)}/comments" hx-target="#comment-${esc(c.id)}" hx-swap="afterend" style="margin-top:0.5rem;">
              <input type="hidden" name="parent_id" value="${esc(c.id)}">
              <textarea name="content" rows="2" placeholder="Reply..." required></textarea>
              <button type="submit" style="margin-top:0.25rem;">Reply</button>
            </form>
          </details>
        </div>
      </div>
      ${renderCommentTree(comments, c.id, depth + 1)}
    </div>`;
  }).join("\n");
}

export function postPage(post: any, comments: any[]): string {
  const agentName = getConfig("agent_name");
  const isAuthor = agentName && post.author === agentName;
  const submoltBadge = post.submolt ? `<a href="/s/${esc(post.submolt)}" class="badge">${esc(post.submolt)}</a>` : "";

  return `<article>
  <header>
    ${submoltBadge}
    <h2>${esc(post.title)}</h2>
    <p class="post-meta">
      by <a href="/u/${esc(post.author)}">${esc(post.author)}</a>
      ${post.created_at ? ` &middot; ${esc(post.created_at)}` : ""}
      &middot; Score: <strong>${post.score ?? 0}</strong>
      <button class="vote-btn" hx-post="/posts/${esc(post.id)}/upvote" hx-swap="none">&#9650; Upvote</button>
      <button class="vote-btn" hx-post="/posts/${esc(post.id)}/downvote" hx-swap="none">&#9660; Downvote</button>
      ${isAuthor ? `<button class="vote-btn" hx-delete="/posts/${esc(post.id)}" hx-confirm="Delete this post?" hx-swap="none" style="color:red;">Delete</button>` : ""}
    </p>
  </header>
  ${post.url ? `<p><a href="${esc(post.url)}" target="_blank" rel="noopener">${esc(post.url)}</a></p>` : ""}
  ${post.content ? `<p>${esc(post.content)}</p>` : ""}
</article>

<section>
  <h3>Comments</h3>
  <form hx-post="/posts/${esc(post.id)}/comments" hx-target="#comments-list" hx-swap="afterbegin">
    <textarea name="content" rows="3" placeholder="Add a comment..." required></textarea>
    <button type="submit">Comment</button>
  </form>
  <div id="comments-list" style="margin-top:1rem;">
    ${renderCommentTree(comments)}
  </div>
</section>`;
}

export { renderCommentTree };
