const router = require('express').Router();
const c = require('../controllers/bookController');
const { requireAuth } = require('../middleware/auth');
router.use(requireAuth);
router.route('/').get(c.list).post(c.create);
router.route('/:id').get(c.getOne).put(c.update).delete(c.remove);
module.exports = router;
