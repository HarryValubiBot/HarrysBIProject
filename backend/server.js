import http from 'node:http';
import { openDb, listTables, listColumns, listForeignKeys } from './db.js';

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => (buf += c));
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.url === '/api/health') return json(res, 200, { ok: true, service: 'harry-bi-backend' });

  if (req.url === '/api/db/introspect' && req.method === 'POST') {
    try {
      const { dbPath } = await readJson(req);
      const db = openDb(dbPath);
      const tables = listTables(db).map(name => ({
        name,
        columns: listColumns(db, name),
        foreignKeys: listForeignKeys(db, name),
      }));
      return json(res, 200, { ok: true, tables });
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message || 'introspect_failed' });
    }
  }

  return json(res, 404, { error: 'not_found' });
});

const PORT = Number(process.env.BI_API_PORT || 8787);
server.listen(PORT, () => {
  console.log(`BI backend running on http://localhost:${PORT}`);
});
