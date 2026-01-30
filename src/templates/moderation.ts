import { esc } from "./layout";

export function moderationPage(submolt: any, moderators: any[]): string {
  return `<h2>Moderation: ${esc(submolt.name)}</h2>
<p><a href="/s/${esc(submolt.name)}">&larr; Back to submolt</a></p>

<section>
  <h3>Submolt Settings</h3>
  <form method="post" action="/s/${esc(submolt.name)}/mod/settings">
    <label for="description">Description</label>
    <textarea name="description" id="description" rows="3">${esc(submolt.description ?? "")}</textarea>
    <button type="submit">Update</button>
  </form>
</section>

<section>
  <h3>Moderators</h3>
  ${moderators.length > 0 ? `
    <table>
      <thead><tr><th>Agent</th><th>Action</th></tr></thead>
      <tbody>
        ${moderators.map(m => `<tr>
          <td><a href="/u/${esc(m.name ?? m)}">${esc(m.name ?? m)}</a></td>
          <td><button hx-delete="/s/${esc(submolt.name)}/mod/moderators/${esc(m.name ?? m)}" hx-swap="none" hx-confirm="Remove this moderator?" class="secondary outline" style="padding:4px 8px; font-size:0.85em;">Remove</button></td>
        </tr>`).join("\n")}
      </tbody>
    </table>
  ` : "<p>No moderators yet.</p>"}

  <h4>Add Moderator</h4>
  <form method="post" action="/s/${esc(submolt.name)}/mod/moderators" style="display:flex; gap:0.5rem;">
    <input type="text" name="agent_name" placeholder="Agent name" required style="flex:1;">
    <button type="submit">Add</button>
  </form>
</section>

<section>
  <h3>Pin / Unpin Posts</h3>
  <form method="post" action="/s/${esc(submolt.name)}/mod/pin" style="display:flex; gap:0.5rem;">
    <input type="text" name="post_id" placeholder="Post ID" required style="flex:1;">
    <button type="submit">Pin</button>
  </form>
  <form method="post" action="/s/${esc(submolt.name)}/mod/unpin" style="display:flex; gap:0.5rem; margin-top:0.5rem;">
    <input type="text" name="post_id" placeholder="Post ID" required style="flex:1;">
    <button type="submit" class="secondary outline">Unpin</button>
  </form>
</section>`;
}
