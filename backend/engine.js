import { openDb, listTables, listColumns, listForeignKeys } from './db.js';
import { introspectAzure, queryAzure, execAzure, listStgTablesAzure, listStgColumnsAzure } from './azure.js';

export async function introspectConnection(payload) {
  const type = payload?.connType || 'sqlite';
  if (type === 'sqlite') {
    const db = openDb(payload.dbPath);
    const tables = listTables(db).map(name => ({
      name,
      columns: listColumns(db, name),
      foreignKeys: listForeignKeys(db, name),
    }));
    db.close();
    return tables;
  }
  if (type === 'azure') {
    return introspectAzure(payload.azure || {});
  }
  throw new Error('unsupported_connection_type');
}

export async function runQueryConnection(payload, sqlText) {
  const type = payload?.connType || 'sqlite';
  if (type === 'sqlite') {
    const db = openDb(payload.dbPath);
    const rows = db.prepare(sqlText).all();
    db.close();
    return rows;
  }
  if (type === 'azure') {
    return queryAzure(payload.azure || {}, sqlText);
  }
  throw new Error('unsupported_connection_type');
}

export async function runExecConnection(payload, sqlText) {
  const type = payload?.connType || 'sqlite';
  if (type === 'azure') return execAzure(payload.azure || {}, sqlText);
  throw new Error('exec_supported_for_azure_only');
}

export async function listStgTablesConnection(payload) {
  const type = payload?.connType || 'sqlite';
  if (type === 'azure') return listStgTablesAzure(payload.azure || {});
  throw new Error('stg_list_supported_for_azure_only');
}

export async function listStgColumnsConnection(payload, tableName) {
  const type = payload?.connType || 'sqlite';
  if (type === 'azure') return listStgColumnsAzure(payload.azure || {}, tableName);
  throw new Error('stg_columns_supported_for_azure_only');
}

export async function testConnection(payload) {
  const type = payload?.connType || 'sqlite';
  if (type === 'sqlite') {
    const db = openDb(payload.dbPath);
    db.prepare('SELECT 1').all();
    db.close();
    return { ok: true };
  }
  if (type === 'azure') {
    await queryAzure(payload.azure || {}, 'SELECT TOP 1 1 AS ok');
    return { ok: true };
  }
  throw new Error('unsupported_connection_type');
}
