import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, applyTransforms, buildChartData } from '../src/bi.js';

test('parseCsv basic', () => {
  const rows = parseCsv('a,b\n1,x\n2,y');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].a, '1');
});

test('applyTransforms rename/filter/derived', () => {
  const rows = [{a:'1',b:'10'},{a:'2',b:'20'}];
  const { data } = applyTransforms(rows, [
    {type:'rename', old:'a', new:'x'},
    {type:'filter_eq', column:'x', value:'2'},
    {type:'derived_math', left:'x', op:'+', right:'b', new_column:'z'}
  ]);
  assert.equal(data.length, 1);
  assert.equal(data[0].z, 22);
});

test('buildChartData sum', () => {
  const rows = [{cat:'A',v:'1'},{cat:'A',v:'2'},{cat:'B',v:'5'}];
  const out = buildChartData(rows, 'cat', 'v', 'sum');
  const map = Object.fromEntries(out.labels.map((k,i)=>[k,out.values[i]]));
  assert.equal(map.A, 3);
  assert.equal(map.B, 5);
});
