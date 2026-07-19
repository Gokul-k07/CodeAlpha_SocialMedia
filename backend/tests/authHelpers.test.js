import test from 'node:test';
import assert from 'node:assert/strict';
import { getLoginIdentifier, getTokenFromRequest } from '../utils/auth.js';

test('getLoginIdentifier accepts email, username, or identifier values', () => {
  assert.equal(getLoginIdentifier({ email: 'demo@example.com' }), 'demo@example.com');
  assert.equal(getLoginIdentifier({ username: 'demoUser' }), 'demoUser');
  assert.equal(getLoginIdentifier({ identifier: 'demoUser' }), 'demoUser');
});

test('getTokenFromRequest reads a cookie token or bearer header token', () => {
  assert.equal(getTokenFromRequest({ cookies: { token: 'cookie-token' } }), 'cookie-token');
  assert.equal(getTokenFromRequest({ headers: { authorization: 'Bearer header-token' } }), 'header-token');
  assert.equal(getTokenFromRequest({}), null);
});
