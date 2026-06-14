module.exports = (req, res) => {
  const { method, url, headers, query, body } = req;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Request Viewer</title>
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
    h2 { color: #4ec9b0; margin-top: 20px; }
    pre { background: #252526; padding: 12px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${method} request received</h1>
  <h2>URL</h2>
  <pre>${url}</pre>
  <h2>Query Params</h2>
  <pre>${JSON.stringify(query, null, 2)}</pre>
  <h2>Headers</h2>
  <pre>${JSON.stringify(headers, null, 2)}</pre>
  <h2>Body</h2>
  <pre>${JSON.stringify(body, null, 2)}</pre>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
};