import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb, listTables, listColumns, listForeignKeys } from '../../backend/db.js';

const tmp = path.resolve('.tmp_star.db');

test('introspect sqlite tables/columns/fks', () => {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  const w = new DatabaseSync(tmp, { open: true });
  w.exec('PRAGMA foreign_keys = ON');
  w.exec('CREATE TABLE dim_region (region_id INTEGER PRIMARY KEY, region_name TEXT)');
  w.exec('CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, region_id INTEGER, amount REAL, FOREIGN KEY(region_id) REFERENCES dim_region(region_id))');

  const db = openDb(tmp);
  const tables = listTables(db);
  assert.deepEqual(tables, ['dim_region', 'fact_sales']);
  const cols = listColumns(db, 'fact_sales').map(c => c.name);
  assert.ok(cols.includes('amount'));
  const fks = listForeignKeys(db, 'fact_sales');
  assert.equal(fks[0].toTable, 'dim_region');

  db.close();
  w.close();
  fs.unlinkSync(tmp);
});
