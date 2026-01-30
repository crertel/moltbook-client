import { layout, partial } from "../templates/layout";
import { moderationPage } from "../templates/moderation";
import * as api from "../api";
import { logAction } from "../db";

function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

export async function handleModeration(req: Request, path: string): Promise<Response | null> {
  // GET /s/:name/mod
  const modMatch = path.match(/^\/s\/([^/]+)\/mod$/);
  if (modMatch && req.method === "GET") {
    const name = decodeURIComponent(modMatch[1]);
    try {
      const submolt = await api.getSubmolt(name);
      const s = submolt.submolt ?? submolt;
      const moderators = s.moderators ?? [];
      const body = moderationPage(s, moderators);
      if (isHtmx(req)) return new Response(partial(body), { headers: { "Content-Type": "text/html" } });
      return new Response(layout(`Mod: ${name}`, body), { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(layout("Error", `<p>${e.message}</p>`), { headers: { "Content-Type": "text/html" }, status: 404 });
    }
  }

  // POST /s/:name/mod/settings
  const settingsMatch = path.match(/^\/s\/([^/]+)\/mod\/settings$/);
  if (settingsMatch && req.method === "POST") {
    const name = decodeURIComponent(settingsMatch[1]);
    try {
      const form = await req.formData();
      const description = form.get("description")?.toString().trim() || undefined;
      await api.updateSubmolt(name, { description });
      logAction("update_submolt", name, description);
      return Response.redirect(`/s/${name}/mod`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /s/:name/mod/moderators
  const addModMatch = path.match(/^\/s\/([^/]+)\/mod\/moderators$/);
  if (addModMatch && req.method === "POST") {
    const name = decodeURIComponent(addModMatch[1]);
    try {
      const form = await req.formData();
      const agentName = form.get("agent_name")?.toString().trim() ?? "";
      if (!agentName) {
        return new Response(partial("", { type: "error", message: "Agent name required" }), { headers: { "Content-Type": "text/html" } });
      }
      await api.addModerator(name, agentName);
      logAction("add_mod", name, agentName);
      return Response.redirect(`/s/${name}/mod`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // DELETE /s/:name/mod/moderators/:agent
  const removeModMatch = path.match(/^\/s\/([^/]+)\/mod\/moderators\/([^/]+)$/);
  if (removeModMatch && req.method === "DELETE") {
    const name = decodeURIComponent(removeModMatch[1]);
    const agentName = decodeURIComponent(removeModMatch[2]);
    try {
      await api.removeModerator(name, agentName);
      logAction("remove_mod", name, agentName);
      if (isHtmx(req)) return new Response(partial("", { type: "success", message: `Removed ${agentName}` }), { headers: { "Content-Type": "text/html" } });
      return Response.redirect(`/s/${name}/mod`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /s/:name/mod/pin
  const pinMatch = path.match(/^\/s\/([^/]+)\/mod\/pin$/);
  if (pinMatch && req.method === "POST") {
    const name = decodeURIComponent(pinMatch[1]);
    try {
      const form = await req.formData();
      const postId = form.get("post_id")?.toString().trim() ?? "";
      if (!postId) {
        return new Response(partial("", { type: "error", message: "Post ID required" }), { headers: { "Content-Type": "text/html" } });
      }
      await api.pinPost(name, postId);
      logAction("pin", name, postId);
      return Response.redirect(`/s/${name}/mod`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  // POST /s/:name/mod/unpin
  const unpinMatch = path.match(/^\/s\/([^/]+)\/mod\/unpin$/);
  if (unpinMatch && req.method === "POST") {
    const name = decodeURIComponent(unpinMatch[1]);
    try {
      const form = await req.formData();
      const postId = form.get("post_id")?.toString().trim() ?? "";
      if (!postId) {
        return new Response(partial("", { type: "error", message: "Post ID required" }), { headers: { "Content-Type": "text/html" } });
      }
      await api.unpinPost(name, postId);
      logAction("unpin", name, postId);
      return Response.redirect(`/s/${name}/mod`, 303);
    } catch (e: any) {
      return new Response(partial("", { type: "error", message: e.message }), { headers: { "Content-Type": "text/html" } });
    }
  }

  return null;
}
