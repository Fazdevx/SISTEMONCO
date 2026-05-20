const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, loadProfile, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(loadProfile);
router.use(requireRole(['admin'])); // Solo admin puede gestionar usuarios

router.get('/', userController.listUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;