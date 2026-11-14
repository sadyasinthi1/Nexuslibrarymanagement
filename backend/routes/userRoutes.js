const router = require('express').Router();
const c = require('../controllers/userController');
const { requireAuth, adminOnly } = require('../middleware/auth');
router.use(requireAuth);
router.get('/me', c.me);
router.put('/me', c.updateMe);
router.delete('/me', c.deleteMe);
router.get('/', adminOnly, c.allUsers);
module.exports = router;
