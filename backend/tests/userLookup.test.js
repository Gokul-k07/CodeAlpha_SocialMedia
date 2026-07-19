import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUserLookupQuery } from '../utils/userLookup.js';

test('buildUserLookupQuery uses ObjectId when identifier is a valid Mongo object id', () => {
  const id = '507f1f77bcf86cd799439011';
  assert.deepEqual(buildUserLookupQuery(id), { _id: id });
});

test('buildUserLookupQuery falls back to username/email lookup for non-object-id values', () => {
  assert.deepEqual(buildUserLookupQuery('demo1'), { $or: [{ username: 'demo1' }, { email: 'demo1' }] });
});
