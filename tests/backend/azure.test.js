import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAzureConfig } from '../../backend/azure.js';

test('normalizeAzureConfig validates required fields', () => {
  assert.throws(() => normalizeAzureConfig({ server: 'x' }), /azure_missing_connection_fields/);
});

test('normalizeAzureConfig sets secure defaults', () => {
  const c = normalizeAzureConfig({ server: 's', database: 'd', user: 'u', password: 'p' });
  assert.equal(c.options.encrypt, true);
  assert.equal(c.options.trustServerCertificate, false);
});
