const router = require('express').Router();
const { createAiHandlers } = require('../controllers/ai');
const handlers = createAiHandlers();
// Both AI use cases are public. Saving a generated recipe uses the protected recipe API.
router.post('/stream', handlers.stream);
router.post('/recipe', handlers.recipe);
module.exports = router;
