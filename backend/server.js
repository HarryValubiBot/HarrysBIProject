import http from 'node:http';

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.url === '/api/health') return json(res, 200, { ok: true, service: 'harry-bi-backend' });
  return json(res, 404, { error: 'not_found' });
});

const PORT = Number(process.env.BI_API_PORT || 8787);
server.listen(PORT, () => {
  console.log(`BI backend running on http://localhost:${PORT}`);
});
