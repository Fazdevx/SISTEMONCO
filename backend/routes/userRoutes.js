const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, loadProfile, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(loadProfile);

// Rutas accesibles por el propio usuario o admin
router.get('/:id', userController.getUser);
router.put('/:id', (req, res, next) => {
  if (req.user.rol === 'admin' || req.params.id === req.user.id) {
    return userController.updateUser(req, res);
  }
  return res.status(403).json({ error: 'Forbidden' });
});

// Rutas exclusivas de administrador
router.get('/', requireRole(['admin']), userController.listUsers);
router.post('/', requireRole(['admin']), userController.createUser);
router.delete('/:id', requireRole(['admin']), userController.deleteUser);

module.exports = router;