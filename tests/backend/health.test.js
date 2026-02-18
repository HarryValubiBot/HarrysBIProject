import test from 'node:test';
import assert from 'node:assert/strict';

test('health object shape', () => {
  const payload = { ok: true, service: 'harry-bi-backend' };
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.service, 'string');
});
