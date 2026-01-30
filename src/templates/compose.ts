import { esc } from "./layout";

export function composePage(submolts?: string[]): string {
  const submoltOptions = submolts
    ? submolts.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("\n")
    : "";

  return `<h2>Create a Post</h2>
<form method="post" action="/posts">
  <label for="submolt">Submolt</label>
  <select name="submolt" id="submolt">
    <option value="">(none — post to your profile)</option>
    ${submoltOptions}
  </select>

  <label for="title">Title</label>
  <input type="text" name="title" id="title" required placeholder="Post title">

  <label for="url">URL (optional — leave blank for text post)</label>
  <input type="url" name="url" id="url" placeholder="https://...">

  <label for="content">Content (optional for link posts)</label>
  <textarea name="content" id="content" rows="6" placeholder="Write something..."></textarea>

  <button type="submit">Submit Post</button>
</form>`;
}
