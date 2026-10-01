const router = require('express').Router();
const account = require('../controllers/account');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);
router.get('/', account.get);
router.put('/', account.update);
router.delete('/', account.remove);
module.exports = router;
