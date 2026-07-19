import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPostCount } from '../utils/profile.js';

test('attachPostCount adds a computed post count to a user payload', () => {
  const user = { _id: 'user-1', fullname: 'Ada Lovelace' };
  const enriched = attachPostCount(user, 7);

  assert.equal(enriched.postCount, 7);
  assert.equal(enriched.fullname, 'Ada Lovelace');
});

test('attachPostCount falls back to zero when no count provided', () => {
  const user = { _id: 'user-2' };
  const enriched = attachPostCount(user);

  assert.equal(enriched.postCount, 0);
});
