const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/mappingController');
const { verifyToken, loadProfile, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(loadProfile);
router.use(requireRole(['admin'])); // Solo administradores pueden gestionar mapeos

// Mapeos de Establecimientos
router.get('/establecimientos', mappingController.listEstablecimientoMapeos);
router.post('/establecimientos', mappingController.createEstablecimientoMapeo);
router.delete('/establecimientos/:id', mappingController.deleteEstablecimientoMapeo);

// Mapeos de Columnas
router.get('/columnas', mappingController.listExcelColumnaMapeos);
router.put('/columnas/:id', mappingController.updateExcelColumnaMapeo);

module.exports = router;
