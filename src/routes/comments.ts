import { partial } from "../templates/layout";
import { renderCommentTree } from "../templates/post";
import * as api from "../api";
import { cacheComment, logAction } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleComments(req: Request, path: string): Promise<Response | null> {
  // POST /posts/:id/comments
  const commentMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
  if (commentMatch && req.method === "POST") {
    const postId = commentMatch[1];
    try {
      const form = await req.formData();
      const content = form.get("content")?.toString().trim() ?? "";
      const parentId = form.get("parent_id")?.toString().trim() || undefined;
      if (!content) {
        return new Response(partial("", { type: "error", message: "Comment cannot be empty" }), { headers: { "Content-Type": "text/html" } });
      }
      const result = await api.createComment(postId, { content, parent_id: parentId });
      logAction("comment", postId, content.substring(0, 100));

      // Re-fetch the comment tree to render new comment
      try {
        const cdata = await api.getComments(postId);
        const comments = cdata.comments ?? cdata ?? [];
        for (const c of comments) cacheComment({ ...c, post_id: postId });

        if (isHtmx(req)) {
          return new Response(renderCommentTree(comments), { headers: { "Content-Type": "text/html" } });
        }
      } catch { /* ignore */ }

      return Response.redirect(`/posts/${postId}`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /comments/:id/upvote
  const upvoteMatch = path.match(/^\/comments\/([^/]+)\/upvote$/);
  if (upvoteMatch && req.method === "POST") {
    const id = upvoteMatch[1];
    try {
      await api.upvoteComment(id);
      logAction("upvote_comment", id);
      return new Response(partial("", { type: "success", message: "Upvoted" }), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /comments/:id/downvote
  const downvoteMatch = path.match(/^\/comments\/([^/]+)\/downvote$/);
  if (downvoteMatch && req.method === "POST") {
    const id = downvoteMatch[1];
    try {
      await api.downvoteComment(id);
      logAction("downvote_comment", id);
      return new Response(partial("", { type: "success", message: "Downvoted" }), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  return null;
}
