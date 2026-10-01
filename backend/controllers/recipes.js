const Recipe = require('../models/recipe');

module.exports = { create, getAll, getOne, update, delete: deleteOne, addInstruction, updateInstruction, deleteInstruction };

const editable = ['title', 'description', 'image', 'ingredients', 'instructions', 'tags'];

function badInput(message) { const error = new Error(message); error.status = 400; return error; }
function text(value, name, required = true) {
  if (typeof value !== 'string' || (required && !value.trim())) throw badInput(`${name} is required.`);
  return value.trim();
}
function input(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badInput('Recipe fields are required.');
  const result = {};
  for (const key of editable) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) {
      if (!partial && ['title', 'image', 'ingredients', 'instructions'].includes(key)) throw badInput(`${key} is required.`);
      continue;
    }
    const value = body[key];
    if (key === 'title') result.title = text(value, 'Title');
    if (key === 'description') result.description = text(value, 'Description', false);
    if (key === 'image') {
      result.image = text(value, 'Image URL');
      let url;
      try { url = new URL(result.image); } catch { throw badInput('Image must be a valid URL.'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw badInput('Image must use http or https.');
    }
    if (key === 'ingredients') {
      if (!Array.isArray(value) || !value.length) throw badInput('Add at least one ingredient.');
      result.ingredients = value.map((item) => ({ name: text(item?.name, 'Ingredient name'), quantity: text(item?.quantity, 'Ingredient quantity') }));
    }
    if (key === 'instructions') {
      if (!Array.isArray(value) || !value.length) throw badInput('Add at least one instruction.');
      result.instructions = value.map((item, index) => ({ step: index + 1, description: text(item?.description, 'Instruction') }));
    }
    if (key === 'tags') {
      if (!Array.isArray(value)) throw badInput('Tags must be an array.');
      result.tags = [...new Set(value.map((tag) => text(tag, 'Tag', false)).filter(Boolean))];
    }
  }
  if (!Object.keys(result).length) throw badInput('No editable recipe fields were supplied.');
  return result;
}
function handleError(res, error) {
  if (error.status === 400 || error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }
  console.error('Recipe request failed:', error);
  return res.status(500).json({ message: 'The recipe request failed. Please try again.' });
}
function validId(id) { return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id); }
async function load(req, res, ownerOnly = false) {
  if (!validId(req.params.id)) { res.status(400).json({ message: 'Invalid recipe ID.' }); return null; }
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) { res.status(404).json({ message: 'Cannot find recipe.' }); return null; }
  if (ownerOnly && String(recipe.ownerId) !== String(req.user?._id)) {
    res.status(403).json({ message: 'Only the creator can change this recipe.' }); return null;
  }
  return recipe;
}
function queryValue(value) {
  if (typeof value !== 'string') throw badInput('Search values must be text.');
  return value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
async function create(req, res) {
  try {
    // Never accept ownership, document IDs, or MongoDB operators from the request body.
    const recipe = await Recipe.create({ ...input(req.body), ownerId: req.user._id });
    return res.status(201).json(recipe);
  } catch (error) { return handleError(res, error); }
}
async function getAll(req, res) {
  try {
    const query = {};
    for (const [param, field] of [['title', 'title'], ['tag', 'tags'], ['ingredient', 'ingredients.name']]) {
      if (req.query[param] !== undefined) query[field] = { $regex: queryValue(req.query[param]), $options: 'i' };
    }
    return res.json(await Recipe.find(query));
  } catch (error) { return handleError(res, error); }
}
async function getOne(req, res) {
  try { const recipe = await load(req, res); if (recipe) return res.json(recipe); }
  catch (error) { return handleError(res, error); }
}
async function update(req, res) {
  try {
    const recipe = await load(req, res, true);
    if (!recipe) return;
    recipe.set(input(req.body, true));
    // save() validates the document and its ingredients/instructions.
    await recipe.save();
    return res.json(recipe);
  } catch (error) { return handleError(res, error); }
}
async function deleteOne(req, res) {
  try {
    const recipe = await load(req, res, true);
    if (!recipe) return;
    await Recipe.findByIdAndDelete(recipe._id);
    return res.json({ message: 'Deleted Recipe' });
  } catch (error) { return handleError(res, error); }
}

// Retain the starter's instruction handlers for compatibility. The current router
// uses PUT /api/recipes/:id to save the complete instruction list.
async function addInstruction(req, res) {
  try {
    const recipe = await load(req, res, true);
    if (!recipe) return;
    recipe.instructions.push({ step: recipe.instructions.length + 1, description: text(req.body?.description, 'Instruction') });
    await recipe.save(); return res.status(201).json(recipe);
  } catch (error) { return handleError(res, error); }
}
async function updateInstruction(req, res) {
  try {
    const recipe = await load(req, res, true);
    if (!recipe) return;
    const instruction = recipe.instructions.id(req.params.instructionId);
    if (!instruction) return res.status(404).json({ message: 'Cannot find instruction.' });
    instruction.description = text(req.body?.description, 'Instruction');
    await recipe.save(); return res.json(recipe);
  } catch (error) { return handleError(res, error); }
}
async function deleteInstruction(req, res) {
  try {
    const recipe = await load(req, res, true);
    if (!recipe) return;
    if (!recipe.instructions.id(req.params.instructionId)) return res.status(404).json({ message: 'Cannot find instruction.' });
    if (recipe.instructions.length === 1) throw badInput('Keep at least one instruction.');
    recipe.instructions.pull({ _id: req.params.instructionId });
    recipe.instructions.forEach((item, index) => { item.step = index + 1; });
    await recipe.save(); return res.json({ message: 'Deleted Instruction' });
  } catch (error) { return handleError(res, error); }
}
