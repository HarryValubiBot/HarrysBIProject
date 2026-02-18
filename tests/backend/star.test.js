import test from 'node:test';
import assert from 'node:assert/strict';
import { detectStarSchema } from '../../backend/star.js';

test('detect star schema basics', () => {
  const tables = [
    { name: 'dim_region', columns: [], foreignKeys: [] },
    { name: 'fact_sales', columns: [], foreignKeys: [{ from:'region_id', toTable:'dim_region', to:'region_id' }] },
  ];
  const s = detectStarSchema(tables);
  assert.deepEqual(s.dimensions, ['dim_region']);
  assert.deepEqual(s.facts, ['fact_sales']);
  assert.equal(s.relationships.length, 1);
});
