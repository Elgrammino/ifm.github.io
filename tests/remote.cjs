const { test } = require('node:test');
const assert = require('node:assert/strict');
const remote = require('../remote');
const config = { databaseURL: 'https://sample-default-rtdb.europe-west1.firebasedatabase.app', apiKey: 'public-key' };
test('public reads work without login, writes require organizer login', async () => {
  const calls = [];
  const client = remote(config, async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.includes('signInWithPassword')) return { ok: true, json: async () => ({ idToken: 'token', localId: 'owner', expiresIn: '3600' }) };
    if (opts.headers?.['X-Firebase-ETag']) return { ok: true, headers: { get: () => 'etag-1' }, json: async () => ({ shift: 0, off: {}, add: [], news: [] }) };
    if (opts.method === 'PUT') return { ok: true };
    return { ok: true, json: async () => ({ shift: 0 }) };
  });
  assert.deepEqual(await client.read(), { shift: 0 });
  await assert.rejects(client.update(x => x), /Login required/);
  await client.login('owner@example.org', 'password');
  await client.update(x => ({ ...x, shift: 10 }));
  assert.equal(calls.at(-1).opts.headers['if-match'], 'etag-1');
  assert.equal(JSON.parse(calls.at(-1).opts.body).shift, 10);
  assert.ok(calls.at(-1).url.includes('auth=token'));
  client.logout();
  await assert.rejects(client.update(x => x), /Login required/);
});
test('conflicting writes retry against newest server state', async () => {
  let version = 0;
  const client = remote(config, async (url, opts = {}) => {
    if (url.includes('signInWithPassword')) return { ok: true, json: async () => ({ idToken: 'token', expiresIn: '3600' }) };
    if (opts.headers?.['X-Firebase-ETag']) return { ok: true, headers: { get: () => 'etag-' + (++version) }, json: async () => ({ shift: version }) };
    if (opts.method === 'PUT') return { status: version === 1 ? 412 : 200, ok: version !== 1 };
  });
  await client.login('owner@example.org', 'password');
  assert.deepEqual(await client.update(x => ({ shift: x.shift + 1 })), { shift: 3 });
});
