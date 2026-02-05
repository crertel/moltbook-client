import { esc, name } from "./layout";
import { getConfig } from "../db";
import { renderMarkdown } from "../markdown";

function renderComment(c: any, postId: string, depth = 0): string {
  const isRoot = depth === 0;
  const score = (c.upvotes ?? 0) - (c.downvotes ?? 0);
  const replies = c.replies ?? [];
  const depthClass = depth > 0 ? ` comment-depth-${Math.min(depth, 5)}` : "";

  return `<div class="comment${isRoot ? " comment-root" : ""}${depthClass}" id="comment-${esc(c.id)}">
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <span style="display:flex; flex-direction:column; align-items:center;">
        <button class="vote-btn" hx-post="/comments/${esc(c.id)}/upvote" hx-target="#comment-${esc(c.id)}" hx-swap="outerHTML">&#9650;</button>
        <span class="score">${score}</span>
        <span class="vote-btn" style="opacity:0.3;">&#9660;</span>
      </span>
      <div style="flex:1;">
        <p class="post-meta">
          <a href="/u/${esc(name(c.author))}">${esc(name(c.author))}</a>
          ${c.created_at ? ` &middot; ${esc(c.created_at)}` : ""}
        </p>
        <div>${renderMarkdown(c.content)}</div>
        <details>
          <summary style="font-size:0.85em; cursor:pointer;">Reply</summary>
          <form hx-post="/posts/${esc(postId)}/comments" hx-target="#comment-${esc(c.id)}" hx-swap="afterend" style="margin-top:0.5rem;">
            <input type="hidden" name="parent_id" value="${esc(c.id)}">
            <textarea name="content" rows="2" placeholder="Reply..." required></textarea>
            <button type="submit" style="margin-top:0.25rem;">Reply</button>
          </form>
        </details>
      </div>
    </div>
    ${replies.map((r: any) => renderComment(r, postId, depth + 1)).join("\n")}
  </div>`;
}

function renderCommentList(comments: any[], postId: string): string {
  if (!comments || comments.length === 0) return "";
  return comments.map(c => renderComment(c, postId, 0)).join("\n");
}

export function postPage(post: any, comments: any[], rawResponse?: { post: any; comments: any }): string {
  const agentName = getConfig("agent_name");
  const postAuthor = name(post.author);
  const postSubmolt = name(post.submolt);
  const isAuthor = agentName && postAuthor === agentName;
  const submoltBadge = postSubmolt ? `<a href="/s/${esc(postSubmolt)}" class="badge">${esc(postSubmolt)}</a>` : "";

  return `<article>
  <header>
    ${submoltBadge}
    <h2>${esc(post.title)}</h2>
    <p class="post-meta">
      by <a href="/u/${esc(postAuthor)}">${esc(postAuthor)}</a>
      ${post.created_at ? ` &middot; ${esc(post.created_at)}` : ""}
      &middot; Score: <strong>${(post.upvotes ?? 0) - (post.downvotes ?? 0)}</strong>
      <button class="vote-btn" hx-post="/posts/${esc(post.id)}/upvote" hx-swap="none">&#9650; Upvote</button>
      <button class="vote-btn" hx-post="/posts/${esc(post.id)}/downvote" hx-swap="none">&#9660; Downvote</button>
      ${isAuthor ? `<button class="vote-btn" hx-delete="/posts/${esc(post.id)}" hx-confirm="Delete this post?" hx-swap="none" style="color:red;">Delete</button>` : ""}
      &middot; <a href="https://www.moltbook.com/post/${esc(post.id)}" target="_blank" rel="noopener">View on Moltbook &#8599;</a>
    </p>
  </header>
  ${post.url ? `<p><a href="${esc(post.url)}" target="_blank" rel="noopener">${esc(post.url)}</a></p>` : ""}
  ${post.content ? `
  <div>${renderMarkdown(post.content)}</div>
  <details style="margin-top:0.5rem;">
    <summary style="font-size:0.85em; cursor:pointer;">View raw</summary>
    <pre><code>${esc(post.content)}</code></pre>
  </details>
  ` : ""}
</article>

<section>
  <h3>Comments</h3>
  <form hx-post="/posts/${esc(post.id)}/comments" hx-target="#comments-list" hx-swap="afterbegin">
    <textarea name="content" rows="3" placeholder="Add a comment..." required></textarea>
    <button type="submit">Comment</button>
  </form>
  <div id="comments-list" style="margin-top:1rem;">
    ${renderCommentList(comments, post.id)}
  </div>
</section>

${rawResponse ? `
<details style="margin-top:2rem;">
  <summary style="cursor:pointer; font-size:0.85em;">View API response as JSON</summary>
  <h4>Post response</h4>
  <pre><code>${esc(JSON.stringify(rawResponse.post, null, 2))}</code></pre>
  <h4>Comments response</h4>
  <pre><code>${esc(JSON.stringify(rawResponse.comments, null, 2))}</code></pre>
</details>
` : ""}`;
}

export { renderCommentList };
