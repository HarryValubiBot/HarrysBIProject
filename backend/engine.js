import { openDb, listTables, listColumns, listForeignKeys } from './db.js';
import { introspectAzure, queryAzure } from './azure.js';

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
