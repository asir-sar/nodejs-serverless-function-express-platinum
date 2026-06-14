const { Redis } = require('@upstash/redis');

// Works with either the Vercel-injected names (KV_REST_API_*)
// or the raw Upstash names (UPSTASH_REDIS_REST_*)
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const LIST_KEY = 'request_log';
const MAX_ENTRIES = 50;

// Headers that shouldn't be stored/displayed since this log is publicly viewable
const SENSITIVE_HEADERS = [
  'cookie',
  'authorization',
  'x-vercel-oidc-token',
  'x-vercel-proxy-signature',
  'x-vercel-proxy-signature-ts',
];

function sanitizeHeaders(headers) {
  const clean = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

module.exports = async (req, res) => {
  // If Redis isn't configured yet, show setup instructions instead of crashing
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(SETUP_HTML);
  }

  const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  const { method, url, headers, query, body } = req;

  // --- JSON feed used by the dashboard's polling ---
  if (url === '/feed' || url.startsWith('/feed?')) {
    const items = await redis.lrange(LIST_KEY, 0, MAX_ENTRIES - 1);
    const parsed = items.map((item) => (typeof item === 'string' ? JSON.parse(item) : item));
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(parsed);
  }

  // --- Clear the log ---
  if (url === '/clear' || url.startsWith('/clear?')) {
    await redis.del(LIST_KEY);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ cleared: true });
  }

  // --- Log this request (skip favicon noise) ---
  if (url !== '/favicon.ico') {
    const entry = {
      timestamp: new Date().toISOString(),
      method,
      url,
      query,
      headers: sanitizeHeaders(headers),
      body: body && Object.keys(body).length ? body : null,
    };
    await redis.lpush(LIST_KEY, JSON.stringify(entry));
    await redis.ltrim(LIST_KEY, 0, MAX_ENTRIES - 1);
  }

  // --- Serve the dashboard page ---
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(DASHBOARD_HTML);
};

const SETUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Setup needed</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f1117; color: #e6e6e6; padding: 40px 20px; line-height: 1.6; }
  .box { max-width: 600px; margin: 0 auto; background: #1a1d27; border: 1px solid #2a2e3a;
    border-radius: 10px; padding: 24px; }
  h1 { font-size: 18px; margin-bottom: 12px; }
  code { background: #14161f; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  ol { margin: 12px 0 0 20px; }
  li { margin-bottom: 8px; }
</style>
</head>
<body>
  <div class="box">
    <h1>Redis not configured yet</h1>
    <p>This page needs a Redis database to store incoming requests.</p>
    <ol>
      <li>In your Vercel project, go to <strong>Storage</strong> &rarr; <strong>Marketplace</strong> and add an <strong>Upstash Redis</strong> database (free tier).</li>
      <li>Connect it to this project &mdash; Vercel will inject <code>KV_REST_API_URL</code> / <code>KV_REST_API_TOKEN</code> (or <code>UPSTASH_REDIS_REST_URL</code> / <code>UPSTASH_REDIS_REST_TOKEN</code>) automatically.</li>
      <li>Run <code>npm install @upstash/redis</code> in your project and redeploy.</li>
    </ol>
  </div>
</body>
</html>`;

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Request Inspector</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f1117;
    color: #e6e6e6;
    padding: 32px 16px;
    line-height: 1.5;
  }
  .container { max-width: 800px; margin: 0 auto; }
  h1 { font-size: 18px; margin-bottom: 8px; }
  .subtitle {
    color: #6b7280;
    font-size: 13px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .live-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #10b981;
    margin-right: 6px;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  button.clear-btn {
    background: #1a1d27;
    border: 1px solid #2a2e3a;
    color: #9ca3af;
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
  }
  button.clear-btn:hover { border-color: #ef4444; color: #ef4444; }
  .request-card {
    background: #1a1d27;
    border: 1px solid #2a2e3a;
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .request-header {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; cursor: pointer;
  }
  .method-badge {
    color: #fff; font-weight: 600; font-size: 12px;
    padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px;
    flex-shrink: 0;
  }
  .path {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 14px; color: #fff; flex: 1; word-break: break-all;
  }
  .timestamp { font-size: 12px; color: #6b7280; white-space: nowrap; }
  .details { padding: 0 16px 16px; display: none; }
  .details.open { display: block; }
  .section-title {
    font-size: 12px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.8px; color: #9ca3af; margin: 16px 0 8px;
  }
  .scroll { max-height: 240px; overflow-y: auto; border: 1px solid #2a2e3a; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 12px; border-bottom: 1px solid #232733; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .key { color: #60a5fa; font-family: 'SF Mono', Monaco, monospace; white-space: nowrap; width: 32%; }
  .value { color: #d1d5db; font-family: 'SF Mono', Monaco, monospace; word-break: break-all; }
  .empty { padding: 8px 0; color: #6b7280; font-size: 13px; font-style: italic; }
  pre {
    background: #14161f; border: 1px solid #2a2e3a; border-radius: 6px;
    padding: 12px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
    color: #d1d5db; overflow-x: auto; white-space: pre-wrap; word-break: break-word;
  }
  .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; font-size: 14px; }
</style>
</head>
<body>
  <div class="container">
    <h1>Request Inspector</h1>
    <div class="subtitle">
      <span><span class="live-dot"></span><span id="status">Waiting for requests...</span></span>
      <button class="clear-btn" onclick="clearLog()">Clear log</button>
    </div>
    <div id="list"></div>
  </div>

<script>
  var methodColors = { GET: '#3b82f6', POST: '#10b981', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#8b5cf6' };
  var lastCount = -1;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTable(obj) {
    var entries = Object.entries(obj || {});
    if (entries.length === 0) return '<p class="empty">-- none --</p>';
    var rows = entries.map(function (pair) {
      var key = pair[0], value = pair[1];
      var val = typeof value === 'string' ? value : JSON.stringify(value);
      return '<tr><td class="key">' + escapeHtml(key) + '</td><td class="value">' + escapeHtml(val) + '</td></tr>';
    }).join('');
    return '<table><tbody>' + rows + '</tbody></table>';
  }

  function renderRequest(entry, index) {
    var color = methodColors[entry.method] || '#6b7280';
    var bodyHtml = entry.body
      ? '<pre>' + escapeHtml(JSON.stringify(entry.body, null, 2)) + '</pre>'
      : '<p class="empty">-- empty --</p>';
    var time = new Date(entry.timestamp).toLocaleTimeString();

    return '<div class="request-card">' +
        '<div class="request-header" onclick="toggle(' + index + ')">' +
          '<span class="method-badge" style="background:' + color + '">' + entry.method + '</span>' +
          '<span class="path">' + escapeHtml(entry.url) + '</span>' +
          '<span class="timestamp">' + time + '</span>' +
        '</div>' +
        '<div class="details" id="details-' + index + '">' +
          '<div class="section-title">Query Params</div>' +
          renderTable(entry.query) +
          '<div class="section-title">Headers</div>' +
          '<div class="scroll">' + renderTable(entry.headers) + '</div>' +
          '<div class="section-title">Body</div>' +
          bodyHtml +
        '</div>' +
      '</div>';
  }

  function toggle(index) {
    document.getElementById('details-' + index).classList.toggle('open');
  }

  function clearLog() {
    fetch('/clear').then(function () {
      lastCount = -1;
      poll();
    });
  }

  function poll() {
    fetch('/feed')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.length === lastCount) return;
        lastCount = data.length;
        var list = document.getElementById('list');
        if (data.length === 0) {
          list.innerHTML = '<div class="empty-state">No requests yet. Send a GET or POST to this URL and it will show up here automatically.</div>';
        } else {
          list.innerHTML = data.map(renderRequest).join('');
        }
        document.getElementById('status').textContent =
          data.length + ' request' + (data.length === 1 ? '' : 's') + ' received -- updating every 3s';
      })
      .catch(function (e) { console.error(e); });
  }

  poll();
  setInterval(poll, 3000);
</script>
</body>
</html>`;