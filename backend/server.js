import http from 'node:http';
import { detectStarSchema } from './star.js';
import { buildAggregateSql } from './query.js';
import { introspectConnection, runQueryConnection, runExecConnection, listStgTablesConnection, listStgColumnsConnection } from './engine.js';
import { buildDimViewSql, buildGenerateDimExecSql } from './dw.js';

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

function logRequest(tag, body) {
  try {
    console.log(`[${new Date().toISOString()}] ${tag}`, JSON.stringify(cacheSafePayload(body)));
  } catch {
    console.log(`[${new Date().toISOString()}] ${tag}`);
  }
}

function logError(tag, err, body) {
  const msg = err?.message || String(err);
  try {
    console.error(`[${new Date().toISOString()}] ${tag} ERROR: ${msg}`, JSON.stringify(cacheSafePayload(body)));
  } catch {
    console.error(`[${new Date().toISOString()}] ${tag} ERROR: ${msg}`);
  }
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
    let body = {};
    try {
      body = await readJson(req);
      logRequest('INTROSPECT', body);
      const tables = await introspectConnection(body);
      const star = detectStarSchema(tables);
      return json(res, 200, { ok: true, tables, star });
    } catch (e) {
      logError('INTROSPECT', e, body);
      return json(res, 400, { ok: false, error: e.message || 'introspect_failed' });
    }
  }

  if (req.url === '/api/db/query' && req.method === 'POST') {
    let body = {};
    try {
      body = await readJson(req);
      logRequest('QUERY', body);
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
      logError('QUERY', e, body);
      return json(res, 400, { ok: false, error: e.message || 'query_failed' });
    }
  }

  if (req.url === '/api/dw/stg-tables' && req.method === 'POST') {
    let body = {};
    try {
      body = await readJson(req);
      const rows = await listStgTablesConnection(body);
      return json(res, 200, { ok: true, tables: rows.map(r => r.name) });
    } catch (e) {
      logError('DW_STG_TABLES', e, body);
      return json(res, 400, { ok: false, error: e.message || 'dw_stg_tables_failed' });
    }
  }

  if (req.url === '/api/dw/stg-columns' && req.method === 'POST') {
    let body = {};
    try {
      body = await readJson(req);
      const cols = await listStgColumnsConnection(body, body.sourceTable);
      return json(res, 200, { ok: true, columns: cols });
    } catch (e) {
      logError('DW_STG_COLUMNS', e, body);
      return json(res, 400, { ok: false, error: e.message || 'dw_stg_columns_failed' });
    }
  }

  if (req.url === '/api/dw/create-dim-view' && req.method === 'POST') {
    let body = {};
    try {
      body = await readJson(req);
      const sql = buildDimViewSql(body);
      await runExecConnection(body, sql);
      return json(res, 200, { ok: true, sql });
    } catch (e) {
      logError('DW_CREATE_DIM_VIEW', e, body);
      return json(res, 400, { ok: false, error: e.message || 'dw_create_dim_view_failed' });
    }
  }

  if (req.url === '/api/dw/generate-dim' && req.method === 'POST') {
    let body = {};
    try {
      body = await readJson(req);
      const sql = buildGenerateDimExecSql(body);
      await runExecConnection(body, sql);
      return json(res, 200, { ok: true, sql });
    } catch (e) {
      logError('DW_GENERATE_DIM', e, body);
      return json(res, 400, { ok: false, error: e.message || 'dw_generate_dim_failed' });
    }
  }

  return json(res, 404, { error: 'not_found' });
});

const queryCache = new Map();

const PORT = Number(process.env.BI_API_PORT || 8787);
server.listen(PORT, () => {
  console.log(`BI backend running on http://localhost:${PORT}`);
});
