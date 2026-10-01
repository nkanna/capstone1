const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const id = '507f1f77bcf86cd799439011';
const owner = '507f191e810c19729de860ea';
const valid = () => ({ title: ' Stew ', description: '', image: 'https://example.com/stew.jpg', ingredients: [{ name: ' Chickpeas ', quantity: ' 1 cup ' }], instructions: [{ step: 9, description: ' Simmer. ' }], tags: ['vegan', 'vegan'] });
function fixture(overrides = {}) {
  const calls = { create: [], find: [], save: 0, removed: [] };
  const doc = { _id: id, ownerId: owner, title: 'Stew', set(fields) { Object.assign(this, fields); }, async save() { calls.save++; return this; } };
  const model = { async create(body) { calls.create.push(body); return body; }, async find(query) { calls.find.push(query); return [doc]; }, async findById() { return doc; }, async findByIdAndDelete(value) { calls.removed.push(value); }, ...overrides };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'recipes.js'), 'utf8'), { module, require(name) { assert.equal(name, '../models/recipe'); return model; }, console: { error() {} }, URL });
  const req = { params: { id }, query: {}, body: valid(), user: { _id: owner } };
  const res = { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  return { ctrl: module.exports, req, res, calls, doc };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
test('create uses the signed-in owner and strips IDs/operators from user input', async () => {
  const f = fixture(); Object.assign(f.req.body, { ownerId: 'attacker', _id: 'fake', $set: { title: 'injected' } });
  await f.ctrl.create(f.req, f.res);
  assert.equal(f.res.statusCode, 201); assert.equal(f.calls.create[0].ownerId, owner);
  assert.equal(f.calls.create[0]._id, undefined); assert.equal(f.calls.create[0].$set, undefined);
  assert.equal(f.res.body.title, 'Stew'); assert.deepEqual(plain(f.res.body.instructions), [{ step: 1, description: 'Simmer.' }]);
});
test('create rejects empty ingredient arrays before writing to the model', async () => {
  const f = fixture(); f.req.body.ingredients = []; await f.ctrl.create(f.req, f.res);
  assert.equal(f.res.statusCode, 400); assert.equal(f.calls.create.length, 0);
});
test('create rejects missing ingredient quantities and unsafe image URLs', async () => {
  for (const change of [{ ingredients: [{ name: 'Chickpeas' }] }, { image: 'javascript:alert(1)' }]) {
    const f = fixture(); Object.assign(f.req.body, change); await f.ctrl.create(f.req, f.res);
    assert.equal(f.res.statusCode, 400); assert.equal(f.calls.create.length, 0);
  }
});
test('update checks ownership before altering or saving another creator’s recipe', async () => {
  const f = fixture(); f.req.user._id = 'another-creator'; await f.ctrl.update(f.req, f.res);
  assert.equal(f.res.statusCode, 403); assert.equal(f.calls.save, 0); assert.equal(f.doc.title, 'Stew');
});
test('update keeps ownership and IDs intact while saving valid editable fields', async () => {
  const f = fixture(); f.req.body = { title: ' New title ', ownerId: 'attacker', _id: 'fake', $unset: { ownerId: '' } };
  await f.ctrl.update(f.req, f.res);
  assert.equal(f.res.statusCode, 200); assert.equal(f.calls.save, 1); assert.equal(f.doc.ownerId, owner);
  assert.equal(f.doc._id, id); assert.equal(f.doc.title, 'New title'); assert.equal(f.doc.$unset, undefined);
});
test('update rejects blank titles without saving', async () => {
  const f = fixture(); f.req.body = { title: ' ' }; await f.ctrl.update(f.req, f.res);
  assert.equal(f.res.statusCode, 400); assert.equal(f.calls.save, 0);
});
test('update reports document validation failures as 400', async () => {
  const f = fixture(); f.doc.save = async () => { const error = new Error('Invalid recipe'); error.name = 'ValidationError'; throw error; };
  await f.ctrl.update(f.req, f.res); assert.equal(f.res.statusCode, 400);
});
test('a missing recipe produces 404 on get, update, and delete', async () => {
  for (const handler of ['getOne', 'update', 'delete']) {
    const f = fixture({ async findById() { return null; } }); await f.ctrl[handler](f.req, f.res);
    assert.equal(f.res.statusCode, 404); assert.equal(f.calls.save, 0); assert.equal(f.calls.removed.length, 0);
  }
});
test('invalid recipe IDs produce 400', async () => {
  const f = fixture(); f.req.params.id = 'bad-id'; await f.ctrl.getOne(f.req, f.res); assert.equal(f.res.statusCode, 400);
});
test('public detail retrieval succeeds without a signed-in user', async () => {
  const f = fixture(); delete f.req.user; await f.ctrl.getOne(f.req, f.res); assert.equal(f.res.body._id, id);
});
test('delete is denied to another creator and succeeds for the owner', async () => {
  const forbidden = fixture(); forbidden.req.user._id = 'other'; await forbidden.ctrl.delete(forbidden.req, forbidden.res);
  assert.equal(forbidden.res.statusCode, 403); assert.equal(forbidden.calls.removed.length, 0);
  const allowed = fixture(); await allowed.ctrl.delete(allowed.req, allowed.res);
  assert.equal(allowed.res.statusCode, 200); assert.deepEqual(allowed.calls.removed, [id]);
});
test('search treats regex characters literally and supports all three query fields', async () => {
  const f = fixture(); f.req.query = { title: '.*', tag: 'Vegan', ingredient: 'Tofu' }; await f.ctrl.getAll(f.req, f.res);
  const query = f.calls.find[0]; assert.equal(new RegExp(query.title.$regex).test('anything'), false);
  assert.equal(new RegExp(query.title.$regex).test('literal .*'), true);
  assert.equal(query.tags.$options, 'i'); assert.equal(query['ingredients.name'].$regex, 'Tofu');
});
