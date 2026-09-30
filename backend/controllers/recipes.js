const Recipe = require("../models/recipe");

module.exports = {
  create,
  getAll,
  getOne,
  update,
  delete: deleteOne,
  addInstruction,
  updateInstruction,
  deleteInstruction,
};

async function addInstruction(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe.ownerId.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    recipe.instructions.push(req.body);
    await recipe.save();
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json(err);
  }
}

async function updateInstruction(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe.ownerId.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const instruction = recipe.instructions.id(req.params.instructionId);
    instruction.set(req.body);
    await recipe.save();
    res.json(recipe);
  } catch (err) {
    res.status(400).json(err);
  }
}

async function deleteInstruction(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe.ownerId.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    recipe.instructions.id(req.params.instructionId).remove();
    await recipe.save();
    res.json({ message: "Deleted Instruction" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function create(req, res) {
  try {
    const recipe = await Recipe.create({ ...req.body, ownerId: req.user._id });
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json(err);
  }
}

async function getAll(req, res) {
  console.log("Hello");
  try {
    const { title, tag, ingredient } = req.query;
    const query = {};
    if (title) {
      query.title = { $regex: title, $options: "i" };
    }
    if (tag) {
      query.tags = tag;
    }
    if (ingredient) {
      query["ingredients.name"] = ingredient;
    }
    const recipes = await Recipe.find(query);
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getOne(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe == null) {
      return res.status(404).json({ message: "Cannot find recipe" });
    }
    res.json(recipe);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function update(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe == null) {
      return res.status(404).json({ message: "Cannot find recipe" });
    }
    if (recipe.ownerId.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.json(updatedRecipe);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function deleteOne(req, res) {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe == null) {
      return res.status(404).json({ message: "Cannot find recipe" });
    }
    if (recipe.ownerId.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    await Recipe.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Recipe" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
