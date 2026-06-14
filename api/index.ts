module.exports = (req, res) => {
  const { method, url, headers, query, body } = req;

  const methodColors = {
    GET: '#3b82f6',
    POST: '#10b981',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
    PATCH: '#8b5cf6',
  };
  const methodColor = methodColors[method] || '#6b7280';

  const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const renderTable = (obj) => {
    const entries = Object.entries(obj || {});
    if (entries.length === 0) return '<p class="empty">— none —</p>';
    return `<table><tbody>${entries.map(([key, value]) => `
      <tr>
        <td class="key">${escapeHtml(key)}</td>
        <td class="value">${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value))}</td>
      </tr>`).join('')}</tbody></table>`;
  };

  const isEmptyBody = body === undefined || body === null ||
    (typeof body === 'object' && Object.keys(body).length === 0) ||
    body === '';

  const bodyContent = isEmptyBody
    ? '<p class="empty">— empty —</p>'
    : `<pre>${escapeHtml(JSON.stringify(body, null, 2))}</pre>`;

  const html = `<!DOCTYPE html>
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
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .method-badge {
    background: ${methodColor};
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .path {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 16px;
    color: #fff;
    word-break: break-all;
  }
  .card {
    background: #1a1d27;
    border: 1px solid #2a2e3a;
    border-radius: 10px;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .card-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #9ca3af;
    padding: 12px 16px;
    border-bottom: 1px solid #2a2e3a;
  }
  .scroll { max-height: 320px; overflow-y: auto; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 16px; border-bottom: 1px solid #232733; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .key { color: #60a5fa; font-family: 'SF Mono', Monaco, monospace; white-space: nowrap; width: 32%; }
  .value { color: #d1d5db; font-family: 'SF Mono', Monaco, monospace; word-break: break-all; }
  .empty { padding: 16px; color: #6b7280; font-size: 13px; font-style: italic; }
  pre {
    padding: 16px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 13px;
    color: #d1d5db;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="method-badge">${method}</span>
      <span class="path">${escapeHtml(url)}</span>
    </div>

    <div class="card">
      <div class="card-title">Query Params</div>
      ${renderTable(query)}
    </div>

    <div class="card">
      <div class="card-title">Headers</div>
      <div class="scroll">${renderTable(headers)}</div>
    </div>

    <div class="card">
      <div class="card-title">Body</div>
      ${bodyContent}
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};