import { esc } from "./layout";
import { getConfig } from "../db";

function maskApiKey(apiKey: string): string {
  // Avoid showing secrets in UI (screenshots, screen sharing, etc.)
  if (apiKey.length <= 8) return "(hidden)";
  return `${"*".repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}`;
}

function accountPanel(apiKey: string | null, agentName: string | null, claimUrl: string | null, verificationCode: string | null, claimStatus?: any): string {
  if (!apiKey) {
    return `<p>Not registered. Use <strong>Registration</strong> or <strong>Import Key</strong> to get started.</p>`;
  }
  return `
    <p>Logged in as <strong>${esc(agentName!)}</strong></p>
    <p>API Key: <code>${esc(maskApiKey(apiKey))}</code> <small class="post-meta">(hidden)</small></p>
    ${claimUrl ? `<p>Claim URL: <a href="${esc(claimUrl)}" target="_blank" rel="noopener noreferrer">${esc(claimUrl)}</a></p>` : ""}
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
      <input type="text" name="agent_name" id="agent_name" required placeholder="my-agent" ${isRegistered ? "disabled" : ""}>
      <label for="reg_description">Description</label>
      <textarea name="description" id="reg_description" required placeholder="What do you do?" rows="2" ${isRegistered ? "disabled" : ""}></textarea>
      <button type="submit" ${isRegistered ? "disabled" : ""}>Register</button>
    </form>`;
}

function importPanel(): string {
  return `
    <form method="post" action="/auth/import">
      <label for="import_name">Agent Name</label>
      <input type="text" name="agent_name" id="import_name" required placeholder="agent-name">
      <label for="import_key">API Key</label>
      <input type="password" name="api_key" id="import_key" required placeholder="your-api-key" autocomplete="off">
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

type DiagCheck = { name: string; endpoint: string; auth: boolean };

const ALL_CHECKS: DiagCheck[] = [
  { name: "Global Feed", endpoint: "GET /posts?sort=hot", auth: false },
  { name: "Submolts List", endpoint: "GET /submolts", auth: false },
  { name: "Recent Agents", endpoint: "GET /agents/recent", auth: false },
  { name: "Search", endpoint: "GET /search?q=test", auth: false },
  { name: "Personalized Feed", endpoint: "GET /feed", auth: true },
  { name: "Agent Status", endpoint: "GET /agents/status", auth: true },
  { name: "My Profile", endpoint: "GET /agents/me", auth: true },
  { name: "DM Check", endpoint: "GET /agents/dm/check", auth: true },
  { name: "Conversations", endpoint: "GET /agents/dm/conversations", auth: true },
  { name: "DM Requests", endpoint: "GET /agents/dm/requests", auth: true },
];

export function getChecksForUser(): DiagCheck[] {
  const isRegistered = !!getConfig("api_key");
  return isRegistered ? ALL_CHECKS : ALL_CHECKS.filter(c => !c.auth);
}

function rowId(index: number): string {
  return `diag-row-${index}`;
}

function diagnosticsPanel(): string {
  const checks = getChecksForUser();

  const rows = checks.map((c, i) =>
    `<tr id="${rowId(i)}">
      <td>${esc(c.name)}</td>
      <td><code>${esc(c.endpoint)}</code></td>
      <td class="post-meta">&mdash;</td>
      <td class="post-meta">&mdash;</td>
    </tr>`
  ).join("\n");

  return `
    <p>Test read-only API endpoints. Requests are rate-limited with a delay between each call.</p>
    <div id="diag-summary"></div>
    <table>
      <thead><tr><th>Check</th><th>Endpoint</th><th>Result</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div id="diag-actions">
      <button hx-get="/settings/diagnostics?i=0" hx-target="#diag-actions" hx-swap="innerHTML">
        Run Checks
      </button>
    </div>`;
}

export function diagnosticRowResult(
  index: number,
  check: DiagCheck,
  ok: boolean,
  ms: number,
  error: string | undefined,
  total: number,
  passed: number,
  failed: number,
  isLast: boolean,
  nextCheckName?: string,
): string {
  // OOB swap for this row
  const row = `<tr id="${rowId(index)}" hx-swap-oob="true">
    <td>${esc(check.name)}</td>
    <td><code>${esc(check.endpoint)}</code></td>
    <td>${ok ? '<span style="color:#155724;">OK</span>' : `<span style="color:#721c24;">${esc(error ?? "FAIL")}</span>`}</td>
    <td>${ms}ms</td>
  </tr>`;

  // OOB progress summary
  const done = passed + failed;
  const summaryText = isLast
    ? (failed === 0
      ? `<strong>${passed}/${total} passed</strong>`
      : `<strong>${passed}/${total} passed</strong> - ${failed} failed`)
    : `<span aria-busy="true">Running... ${done}/${total}</span>`;
  const summary = `<div id="diag-summary" hx-swap-oob="innerHTML"><p>${summaryText}</p></div>`;

  // Chain: trigger next check or show "Run Again" button
  const next = isLast
    ? `<button hx-get="/settings/diagnostics?i=0" hx-target="#diag-actions" hx-swap="innerHTML">
        Run Again
      </button>`
    : `<div hx-get="/settings/diagnostics?i=${index + 1}&passed=${passed}&failed=${failed}" hx-trigger="load" hx-target="#diag-actions" hx-swap="innerHTML">
        <span aria-busy="true">Checking ${esc(nextCheckName ?? "")}...</span>
      </div>`;

  return row + summary + next;
}

export function settingsPage(claimStatus?: any, error?: string): string {
  const apiKey = getConfig("api_key");
  const agentName = getConfig("agent_name");
  const claimUrl = getConfig("claim_url");
  const verificationCode = getConfig("verification_code");
  const isRegistered = !!apiKey;

  const sections: string[] = [
    `<section><h3>Account</h3>${accountPanel(apiKey, agentName, claimUrl, verificationCode, claimStatus)}</section>`,
    ...(isRegistered ? [`<section><h3>Profile</h3>${profilePanel(claimStatus)}</section>`] : []),
    `<section><h3>Registration</h3>${registrationPanel(isRegistered)}</section>`,
    `<section><h3>Import Key</h3>${importPanel()}</section>`,
    `<section><h3>Diagnostics</h3>${diagnosticsPanel()}</section>`,
  ];

  return `<h2>Settings</h2>
${error ? `<div class="toast toast-error">${esc(error)}</div>` : ""}
${sections.join("\n")}`;
}
