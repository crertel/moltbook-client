import { layout, partial } from "../templates/layout";
import { postPage } from "../templates/post";
import { composePage } from "../templates/compose";
import { renderPostCard } from "../templates/feed";
import * as api from "../api";
import { cachePost, cacheComment, logAction } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handlePosts(req: Request, path: string): Promise<Response | null> {
  // GET /compose
  if (path === "/compose" && req.method === "GET") {
    let submolts: string[] = [];
    try {
      const data = await api.listSubmolts();
      const list = data.submolts ?? data ?? [];
      submolts = list.map((s: any) => s.name);
    } catch { /* ignore */ }
    const body = composePage(submolts);
    return new Response(layout("New Post", body), { headers: { "Content-Type": "text/html" } });
  }

  // POST /posts — create post
  if (path === "/posts" && req.method === "POST") {
    try {
      const form = await req.formData();
      const title = form.get("title")?.toString().trim() ?? "";
      const content = form.get("content")?.toString().trim() || undefined;
      const url = form.get("url")?.toString().trim() || undefined;
      const submolt = form.get("submolt")?.toString().trim() || undefined;
      if (!title) {
        return new Response(layout("New Post", composePage()), { headers: { "Content-Type": "text/html" } });
      }
      const result = await api.createPost({ title, content, url, submolt });
      logAction("post", result.id ?? result.post?.id, title);
      const postId = result.id ?? result.post?.id;
      return Response.redirect(postId ? `/posts/${postId}` : "/", 303);
    } catch (e: any) {
      const body = `<div class="toast toast-error">${e.message}</div>` + composePage();
      return new Response(layout("New Post", body), { headers: { "Content-Type": "text/html" } });
    }
  }

  // GET /posts/:id
  const postMatch = path.match(/^\/posts\/([^/]+)$/);
  if (postMatch && req.method === "GET") {
    const id = postMatch[1];
    try {
      const post = await api.getPost(id);
      cachePost(post.post ?? post);
      let comments: any[] = [];
      try {
        const cdata = await api.getComments(id);
        comments = cdata.comments ?? cdata ?? [];
        for (const c of comments) cacheComment({ ...c, post_id: id });
      } catch { /* no comments */ }
      const body = postPage(post.post ?? post, comments);
      if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
      return new Response(layout((post.post ?? post).title ?? "Post", body), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(layout("Error", `<p>Could not load post: ${e.message}</p>`), { headers: { "Content-Type": "text/html" }, status: 404 });
    }
  }

  // POST /posts/:id/upvote
  const upvoteMatch = path.match(/^\/posts\/([^/]+)\/upvote$/);
  if (upvoteMatch && req.method === "POST") {
    const id = upvoteMatch[1];
    try {
      await api.upvotePost(id);
      logAction("upvote", id);
      const post = await api.getPost(id);
      cachePost(post.post ?? post);
      return new Response(renderPostCard(post.post ?? post), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /posts/:id/downvote
  const downvoteMatch = path.match(/^\/posts\/([^/]+)\/downvote$/);
  if (downvoteMatch && req.method === "POST") {
    const id = downvoteMatch[1];
    try {
      await api.downvotePost(id);
      logAction("downvote", id);
      const post = await api.getPost(id);
      cachePost(post.post ?? post);
      return new Response(renderPostCard(post.post ?? post), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // DELETE /posts/:id
  const deleteMatch = path.match(/^\/posts\/([^/]+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const id = deleteMatch[1];
    try {
      await api.deletePost(id);
      logAction("delete_post", id);
      if (isHtmx(req)) {
        return new Response(partial("", { type: "success", message: "Post deleted" }), {
          headers: { "Content-Type": "text/html", "HX-Redirect": "/" },
        });
      }
      return Response.redirect("/", 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  return null;
}
