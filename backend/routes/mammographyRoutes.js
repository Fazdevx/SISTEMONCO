const express = require('express');
const router = express.Router();
const mammographyController = require('../controllers/mammographyController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// 1. Rutas de Estadísticas (Deben ir antes de las rutas con :id)
router.get('/stats/dashboard', mammographyController.getDashboardStats);
router.get('/export', mammographyController.exportMammographies);

// 2. Rutas CRUD
router.get('/', mammographyController.listMammographies);
router.get('/:id', mammographyController.getMammography);
router.put('/:id', requireRole(['admin', 'microred', 'establecimiento']), mammographyController.updateMammography);
router.delete('/:id', requireRole(['admin']), mammographyController.deleteMammography);

module.exports = router;