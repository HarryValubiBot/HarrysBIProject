import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDimViewSql, buildGenerateDimExecSql } from '../../backend/dw.js';

test('buildDimViewSql builds dim.v_ view from stg source', () => {
  const sql = buildDimViewSql({
    viewName: 'customers',
    sourceTable: 'customers_raw',
    columns: [{ from: 'id', to: 'customer_id' }, { from: 'name', to: 'customer_name' }],
    whereClause: "is_deleted = 0"
  });
  assert.match(sql, /CREATE OR ALTER VIEW \[dim\]\.\[v_customers\]/i);
  assert.match(sql, /FROM \[stg\]\.\[customers_raw\]/i);
});

test('buildGenerateDimExecSql builds proc exec', () => {
  const sql = buildGenerateDimExecSql({ viewName: 'customers' });
  assert.match(sql, /@SourceSchema='dim'/);
  assert.match(sql, /@TargetSchema='dim'/);
});
