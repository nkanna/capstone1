const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAccountHandlers } = require('../services/account');
const { createVerifyToken } = require('../services/authenticated-user');

const id = '507f1f77bcf86cd799439011';
function fixture() {
  const calls = [];
  const user = { _id: id, email: 'cook@example.com', password: 'original-hash',
    comparePassword(password, callback) { callback(null, password === 'correct-password'); },
    async save() { calls.push('save'); },
  };
  const User = { async findById(value) { calls.push(['find', value]); return user; }, async deleteOne(filter) { calls.push(['user', filter]); } };
  const Recipe = { async deleteMany(filter) { calls.push(['recipes', filter]); } };
  const signToken = value => { calls.push(['token', value]); return 'fresh-token'; };
  const handlers = createAccountHandlers({ User, Recipe, signToken });
  const req = { user: { _id: id }, body: { currentPassword: 'correct-password', email: 'Updated@Example.com' } };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  return { calls, user, User, Recipe, handlers, req, res };
}
test('account responses never return the stored password', async () => {
  const f = fixture(); await f.handlers.get(f.req, f.res);
  assert.deepEqual(f.res.body, { _id: id, email: 'cook@example.com' });
});
test('missing, invalid and wrong passwords cannot delete any records', async () => {
  for (const password of [undefined, '', [], 'wrong-password']) {
    const f = fixture(); f.req.body.currentPassword = password;
    await f.handlers.remove(f.req, f.res);
    assert.ok([400, 403].includes(f.res.statusCode));
    assert.equal(f.calls.filter(call => ['recipes', 'user'].includes(call[0])).length, 0);
  }
});
test('deletion uses authenticated ownership and ignores attacker-supplied user IDs', async () => {
  const f = fixture(); f.req.body._id = 'other-user'; f.req.body.ownerId = 'other-user';
  await f.handlers.remove(f.req, f.res);
  assert.deepEqual(f.calls.slice(-2), [['recipes', { ownerId: id }], ['user', { _id: id }]]);
  assert.equal(f.res.statusCode, 200);
});
test('failed recipe cleanup never deletes the user or reports success', async () => {
  const f = fixture(); f.Recipe.deleteMany = async () => { throw new Error('Database unavailable'); };
  await f.handlers.remove(f.req, f.res);
  assert.equal(f.res.statusCode, 503);
  assert.equal(f.calls.some(call => call[0] === 'user'), false);
  assert.match(f.res.body.message, /Some recipes may have been removed/);
});
test('failed user deletion reports incomplete cleanup and can be retried', async () => {
  const f = fixture(); f.User.deleteOne = async () => { throw new Error('Database unavailable'); };
  await f.handlers.remove(f.req, f.res);
  assert.equal(f.res.statusCode, 503);
  assert.ok(f.calls.some(call => call[0] === 'recipes'));
});
test('updates authenticate, normalize email and only change allowed fields', async () => {
  const f = fixture(); Object.assign(f.req.body, { _id: 'other-user', ownerId: 'other-user', password: 'unverified-replacement' });
  await f.handlers.update(f.req, f.res);
  assert.equal(f.user._id, id); assert.equal(f.user.email, 'updated@example.com');
  assert.equal(f.user.password, 'original-hash'); assert.ok(f.calls.includes('save'));
  assert.deepEqual(f.res.body, { user: { _id: id, email: 'updated@example.com' }, token: 'fresh-token' });
});
test('password changes go through save so the existing bcrypt hook runs', async () => {
  const f = fixture(); f.req.body.newPassword = 'New-password-123!';
  await f.handlers.update(f.req, f.res);
  assert.equal(f.user.password, 'New-password-123!'); assert.ok(f.calls.includes('save'));
});
test('invalid emails, short passwords and bcrypt-truncated passwords cannot be saved', async () => {
  for (const change of [{ email: 'bad-email' }, { newPassword: 'short' }, { newPassword: '😊'.repeat(19) }]) {
    const f = fixture(); Object.assign(f.req.body, change);
    await f.handlers.update(f.req, f.res);
    assert.equal(f.res.statusCode, 400); assert.equal(f.calls.includes('save'), false);
  }
});
test('wrong passwords cannot update accounts and duplicate emails produce a clear conflict', async () => {
  const f = fixture(); f.req.body.currentPassword = 'wrong';
  await f.handlers.update(f.req, f.res); assert.equal(f.res.statusCode, 403);
  assert.equal(f.calls.includes('save'), false);
  const duplicate = fixture(); duplicate.user.save = async () => { throw { code: 11000 }; };
  await duplicate.handlers.update(duplicate.req, duplicate.res); assert.equal(duplicate.res.statusCode, 409);
});
test('deleted accounts cannot be read, updated or deleted again', async () => {
  for (const action of ['get', 'update', 'remove']) {
    const f = fixture(); f.User.findById = async () => null;
    await f.handlers[action](f.req, f.res);
    assert.equal(f.res.statusCode, 401);
    assert.equal(f.calls.length, 0);
  }
});
test('authentication rejects signed tokens for deleted users and never calls the next handler', async () => {
  const f = fixture(); const middleware = createVerifyToken({ jwt: { verify() { return { user: { _id: id } }; } }, User: { async findById() { return null; } }, secret: () => 'test-secret' });
  let next = false; await middleware({ headers: { authorization: 'Bearer old-token' } }, f.res, () => { next = true; });
  assert.equal(f.res.statusCode, 401); assert.equal(next, false);
});
test('authentication verifies HS256 and uses the database identity as a string', async () => {
  const f = fixture(); const req = { headers: { authorization: 'Bearer token' } };
  const middleware = createVerifyToken({ jwt: { verify(token, secret, options) {
    assert.equal(token, 'token'); assert.equal(secret, 'test-secret'); assert.deepEqual(options, { algorithms: ['HS256'] });
    return { user: { _id: id, email: 'stale@example.com' } };
  } }, User: f.User, secret: () => 'test-secret' });
  let next = false; await middleware(req, f.res, () => { next = true; });
  assert.equal(next, true); assert.deepEqual(req.user, { _id: id, email: 'cook@example.com' });
});
test('malformed headers and invalid signatures do not reach the database', async () => {
  for (const header of [undefined, 'Basic token', 'Bearer', 'Bearer one two', 'Bearer invalid']) {
    const f = fixture(); const middleware = createVerifyToken({ jwt: { verify() { throw new Error('Bad signature'); } }, User: f.User, secret: () => 'test-secret' });
    await middleware({ headers: { authorization: header } }, f.res, () => assert.fail('Unauthorized next'));
    assert.equal(f.res.statusCode, 401); assert.equal(f.calls.length, 0);
  }
});
test('a database outage during authentication returns an availability error', async () => {
  const f = fixture(); const middleware = createVerifyToken({ jwt: { verify() { return { user: { _id: id } }; } }, User: { async findById() { throw new Error('Offline'); } }, secret: () => 'test-secret' });
  await middleware({ headers: { authorization: 'Bearer token' } }, f.res, () => assert.fail('Unavailable next'));
  assert.equal(f.res.statusCode, 503);
});
