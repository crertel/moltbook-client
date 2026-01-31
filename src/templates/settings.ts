import { esc } from "./layout";
import { getConfig } from "../db";

type Category = "account" | "registration" | "import" | "profile" | "diagnostics";

function categoryLabel(cat: Category): string {
  switch (cat) {
    case "account": return "Account";
    case "registration": return "Registration";
    case "import": return "Import Key";
    case "profile": return "Profile";
    case "diagnostics": return "Diagnostics";
  }
}

function accountPanel(apiKey: string | null, agentName: string | null, claimUrl: string | null, verificationCode: string | null, claimStatus?: any): string {
  if (!apiKey) {
    return `<p>Not registered. Use <strong>Registration</strong> or <strong>Import Key</strong> to get started.</p>`;
  }
  return `
    <p>Logged in as <strong>${esc(agentName!)}</strong></p>
    <p>API Key: <code>${esc(apiKey)}</code></p>
    ${claimUrl ? `<p>Claim URL: <a href="${esc(claimUrl)}" target="_blank">${esc(claimUrl)}</a></p>` : ""}
    ${verificationCode ? `<p>Verification code: <code>${esc(verificationCode)}</code></p>` : ""}
    ${claimStatus ? `<p>Claim status: <strong>${esc(claimStatus.status ?? "unknown")}</strong></p>` : ""}
    <div style="margin-top:1rem;">
      <form method="post" action="/auth/heartbeat" style="display:inline;">
        <button type="submit" class="secondary outline">Send Heartbeat</button>
      </form>
      <form method="post" action="/auth/logout" style="display:inline; margin-left:0.5rem;">
        <button type="submit" class="secondary outline" style="color:red;">Logout</button>
      </form>
    </div>`;
}

function registrationPanel(isRegistered: boolean): string {
  return `
    <form method="post" action="/auth/register">
      <label for="agent_name">Agent Name</label>
      <input type="text" name="agent_name" id="agent_name" required placeholder="my-cool-agent" ${isRegistered ? "disabled" : ""}>
      <label for="reg_description">Description</label>
      <textarea name="description" id="reg_description" required placeholder="What does your agent do?" rows="2" ${isRegistered ? "disabled" : ""}></textarea>
      <button type="submit" ${isRegistered ? "disabled" : ""}>Register</button>
    </form>`;
}

function importPanel(): string {
  return `
    <form method="post" action="/auth/import">
      <label for="import_name">Agent Name</label>
      <input type="text" name="agent_name" id="import_name" required placeholder="agent-name">
      <label for="import_key">API Key</label>
      <input type="text" name="api_key" id="import_key" required placeholder="your-api-key">
      <button type="submit">Import</button>
    </form>`;
}

function profilePanel(claimStatus?: any): string {
  return `
    <form method="post" action="/profile/update">
      <label for="description">Description</label>
      <textarea name="description" id="description" rows="3" placeholder="Tell others about yourself...">${esc(claimStatus?.description ?? "")}</textarea>
      <button type="submit">Update</button>
    </form>

    <h4>Upload Avatar</h4>
    <form method="post" action="/profile/avatar" enctype="multipart/form-data">
      <input type="file" name="avatar" accept="image/*" required>
      <button type="submit">Upload</button>
    </form>`;
}

function diagnosticsPanel(): string {
  return `
    <p>Test all read-only API endpoints. Requests are rate-limited with a delay between each call.</p>
    <div id="diag-results">
      <button hx-get="/settings/diagnostics?_fragment=1" hx-target="#diag-results" hx-swap="innerHTML" hx-indicator="#global-loader">
        Run Checks
      </button>
    </div>`;
}

export function diagnosticsResults(results: { name: string; endpoint: string; ok: boolean; ms: number; error?: string }[]): string {
  const passed = results.filter(r => r.ok).length;
  const total = results.length;
  const summary = passed === total
    ? `<p><strong>${passed}/${total} passed</strong></p>`
    : `<p><strong>${passed}/${total} passed</strong> — some endpoints failed</p>`;

  const rows = results.map(r =>
    `<tr>
      <td>${esc(r.name)}</td>
      <td><code>${esc(r.endpoint)}</code></td>
      <td>${r.ok ? "OK" : `<span style="color:#721c24;">${esc(r.error ?? "FAIL")}</span>`}</td>
      <td>${r.ms}ms</td>
    </tr>`
  ).join("\n");

  return `${summary}
    <table>
      <thead><tr><th>Check</th><th>Endpoint</th><th>Result</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <button hx-get="/settings/diagnostics?_fragment=1" hx-target="#diag-results" hx-swap="innerHTML" hx-indicator="#global-loader" style="margin-top:1rem;">
      Run Again
    </button>`;
}

export function settingsPage(claimStatus?: any, error?: string): string {
  const apiKey = getConfig("api_key");
  const agentName = getConfig("agent_name");
  const claimUrl = getConfig("claim_url");
  const verificationCode = getConfig("verification_code");
  const isRegistered = !!apiKey;

  const categories: Category[] = isRegistered
    ? ["account", "profile", "registration", "import", "diagnostics"]
    : ["account", "registration", "import", "diagnostics"];

  const panels: Record<Category, string> = {
    account: accountPanel(apiKey, agentName, claimUrl, verificationCode, claimStatus),
    registration: registrationPanel(isRegistered),
    import: importPanel(),
    profile: profilePanel(claimStatus),
    diagnostics: diagnosticsPanel(),
  };

  const defaultCat = categories[0];

  const navItems = categories.map(cat =>
    `<li>
      <a href="#" data-cat="${cat}" onclick="document.querySelectorAll('.settings-panel').forEach(p=>p.hidden=true);document.getElementById('panel-'+this.dataset.cat).hidden=false;document.querySelectorAll('.settings-nav a').forEach(a=>a.removeAttribute('aria-current'));this.setAttribute('aria-current','page');return false;"
        ${cat === defaultCat ? 'aria-current="page"' : ""}
      >${categoryLabel(cat)}</a>
    </li>`
  ).join("\n");

  const panelDivs = categories.map(cat =>
    `<div class="settings-panel" id="panel-${cat}" ${cat !== defaultCat ? "hidden" : ""}>
      ${panels[cat]}
    </div>`
  ).join("\n");

  return `<h2>Settings</h2>

${error ? `<div class="toast toast-error">${esc(error)}</div>` : ""}

<div style="display:grid; grid-template-columns:200px 1fr; gap:2rem; align-items:start;">
  <nav class="settings-nav">
    <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.5rem;">
      ${navItems}
    </ul>
  </nav>
  <div>
    ${panelDivs}
  </div>
</div>`;
}
