'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareMigrationState } = require('../src/database/migrationStatus');

test('migration state ready when local and applied match', () => {
  const result = compareMigrationState([{ filename:'001_a.sql',checksum:'x' }],[{ filename:'001_a.sql',checksum:'x' }]);
  assert.equal(result.ready,true); assert.deepEqual(result.pending,[]); assert.deepEqual(result.mismatched,[]);
});
test('migration state detects pending and checksum mismatch', () => {
  const result = compareMigrationState([{filename:'001_a.sql',checksum:'x'},{filename:'002_b.sql',checksum:'y'}],[{filename:'001_a.sql',checksum:'z'}]);
  assert.equal(result.ready,false); assert.deepEqual(result.pending,['002_b.sql']); assert.deepEqual(result.mismatched,['001_a.sql']);
});
test('migration state detects missing schema table and orphaned migration', () => {
  const missing = compareMigrationState([{filename:'001_a.sql',checksum:'x'}],[],{migrationTableExists:false});
  assert.equal(missing.ready,false); assert.deepEqual(missing.pending,['001_a.sql']);
  const orphan = compareMigrationState([],[{filename:'999_unknown.sql',checksum:'x'}]);
  assert.deepEqual(orphan.orphaned,['999_unknown.sql']); assert.equal(orphan.ready,false);
});
