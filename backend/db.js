import { DatabaseSync } from 'node:sqlite';

export function openDb(path) {
  if (!path) throw new Error('db_path_required');
  return new DatabaseSync(path, { open: true, readOnly: true });
}

export function listTables(db) {
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  return stmt.all().map(r => r.name);
}

export function listColumns(db, table) {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  return stmt.all().map(r => ({ name: r.name, type: r.type, pk: !!r.pk }));
}

export function listForeignKeys(db, table) {
  const stmt = db.prepare(`PRAGMA foreign_key_list(${table})`);
  return stmt.all().map(r => ({ from: r.from, toTable: r.table, to: r.to }));
}
