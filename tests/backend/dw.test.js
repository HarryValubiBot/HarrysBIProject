import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDimViewSql, buildGenerateDimExecSql, buildT1DimensionProcSql } from '../../backend/dw.js';

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

test('buildT1DimensionProcSql includes BKs', () => {
  const sql = buildT1DimensionProcSql({ targetTableName: 'customer', sourceViewName: 'v_customer', bks: 'customer_id,company_id' });
  assert.match(sql, /sp_create_T1_dimension_view_based_proc/);
  assert.match(sql, /@BKs='customer_id,company_id'/);
});
