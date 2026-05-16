const express = require('express');
const router = express.Router();
const establishmentController = require('../controllers/establishmentController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.get('/microredes', establishmentController.getMicroredes);
router.get('/establecimientos', establishmentController.getEstablecimientos);

module.exports = router;