import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAggregateSql } from '../../backend/query.js';

test('buildAggregateSql emits expected join query', () => {
  const sql = buildAggregateSql({
    factTable: 'fact_sales',
    dimTable: 'dim_region',
    dimJoinFrom: 'region_id',
    dimJoinTo: 'region_id',
    xColumn: 'region_name',
    yColumn: 'amount',
    agg: 'sum',
  });
  assert.match(sql, /SELECT d\.\[region_name\] AS label/i);
  assert.match(sql, /SUM\(f\.\[amount\]\)/i);
});
