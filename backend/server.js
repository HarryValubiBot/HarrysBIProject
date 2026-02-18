import http from 'node:http';
import { detectStarSchema } from './star.js';
import { buildAggregateSql } from './query.js';
import { introspectConnection, runQueryConnection } from './engine.js';

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

function cacheSafePayload(body) {
  const copy = structuredClone(body || {});
  if (copy.azure?.password) copy.azure.password = '__redacted__';
  return copy;
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
      const body = await readJson(req);
      const tables = await introspectConnection(body);
      const star = detectStarSchema(tables);
      return json(res, 200, { ok: true, tables, star });
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message || 'introspect_failed' });
    }
  }

  if (req.url === '/api/db/query' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const cacheKey = JSON.stringify(cacheSafePayload(body));
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 30_000) {
        return json(res, 200, { ok: true, rows: cached.rows, sql: cached.sql, cached: true });
      }

      const sql = buildAggregateSql(body);
      const rows = await runQueryConnection(body, sql);
      queryCache.set(cacheKey, { ts: Date.now(), rows, sql });
      if (queryCache.size > 100) {
        const first = queryCache.keys().next().value;
        queryCache.delete(first);
      }
      return json(res, 200, { ok: true, rows, sql, cached: false });
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message || 'query_failed' });
    }
  }

  return json(res, 404, { error: 'not_found' });
});

const queryCache = new Map();

const PORT = Number(process.env.BI_API_PORT || 8787);
server.listen(PORT, () => {
  console.log(`BI backend running on http://localhost:${PORT}`);
});
