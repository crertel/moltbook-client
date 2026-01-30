import { esc } from "./layout";
import { getConfig } from "../db";

export function settingsPage(claimStatus?: any, error?: string): string {
  const apiKey = getConfig("api_key");
  const agentName = getConfig("agent_name");
  const claimUrl = getConfig("claim_url");
  const verificationCode = getConfig("verification_code");
  const isRegistered = !!apiKey;

  return `<h2>Settings</h2>

${error ? `<div class="toast toast-error">${esc(error)}</div>` : ""}

<section>
  <h3>Account Status</h3>
  ${isRegistered ? `
    <p>Logged in as <strong>${esc(agentName!)}</strong></p>
    ${claimUrl ? `<p>Claim URL: <a href="${esc(claimUrl)}" target="_blank">${esc(claimUrl)}</a></p>` : ""}
    ${verificationCode ? `<p>Verification code: <code>${esc(verificationCode)}</code></p>` : ""}
    ${claimStatus ? `<p>Claim status: <strong>${esc(claimStatus.status ?? "unknown")}</strong></p>` : ""}
    <form method="post" action="/auth/heartbeat" style="display:inline;">
      <button type="submit" class="secondary outline">Send Heartbeat</button>
    </form>
    <form method="post" action="/auth/logout" style="display:inline; margin-left:0.5rem;">
      <button type="submit" class="secondary outline" style="color:red;">Logout</button>
    </form>
  ` : `
    <p>Not registered. Register a new agent or import an existing API key below.</p>
  `}
</section>

<section>
  <h3>Register New Agent</h3>
  <form method="post" action="/auth/register">
    <label for="agent_name">Agent Name</label>
    <input type="text" name="agent_name" id="agent_name" required placeholder="my-cool-agent" ${isRegistered ? "disabled" : ""}>
    <label for="reg_description">Description</label>
    <textarea name="description" id="reg_description" required placeholder="What does your agent do?" rows="2" ${isRegistered ? "disabled" : ""}></textarea>
    <button type="submit" ${isRegistered ? "disabled" : ""}>Register</button>
  </form>
</section>

<section>
  <h3>Import API Key</h3>
  <form method="post" action="/auth/import">
    <label for="import_name">Agent Name</label>
    <input type="text" name="agent_name" id="import_name" required placeholder="agent-name">
    <label for="import_key">API Key</label>
    <input type="text" name="api_key" id="import_key" required placeholder="your-api-key">
    <button type="submit">Import</button>
  </form>
</section>

${isRegistered ? `
<section>
  <h3>Edit Profile</h3>
  <form method="post" action="/profile/update">
    <label for="description">Description</label>
    <textarea name="description" id="description" rows="3" placeholder="Tell others about yourself...">${esc(claimStatus?.description ?? "")}</textarea>
    <button type="submit">Update</button>
  </form>

  <h4>Upload Avatar</h4>
  <form method="post" action="/profile/avatar" enctype="multipart/form-data">
    <input type="file" name="avatar" accept="image/*" required>
    <button type="submit">Upload</button>
  </form>
</section>
` : ""}`;
}
