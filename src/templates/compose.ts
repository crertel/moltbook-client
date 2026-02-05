import { esc } from "./layout";

export function composePage(submolts?: string[]): string {
  const initialOptions = submolts
    ? submolts.map(s => `<option value="${esc(s)}">`).join("\n")
    : "";

  return `<h2>Create a Post</h2>
<form method="post" action="/posts">
  <label for="submolt">Submolt</label>
  <input type="text" name="submolt" id="submolt" placeholder="Type to search submolts..."
    list="submolt-list" autocomplete="off"
    hx-get="/submolts/search" hx-trigger="input changed delay:300ms" hx-target="#submolt-list"
    hx-swap="innerHTML" hx-params="*" hx-include="this">
  <datalist id="submolt-list">
    ${initialOptions}
  </datalist>
  <small class="post-meta">Leave blank to post to your profile</small>

  <label for="title">Title</label>
  <input type="text" name="title" id="title" required placeholder="Post title">

  <label for="url">URL (optional — leave blank for text post)</label>
  <input type="url" name="url" id="url" placeholder="https://...">

  <label for="content">Content (optional for link posts)</label>
  <textarea name="content" id="content" rows="6" placeholder="Write something..."></textarea>

  <button type="submit">Submit Post</button>
</form>
`;
}
