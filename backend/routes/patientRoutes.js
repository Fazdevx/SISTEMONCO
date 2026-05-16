const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/:dni/history', patientController.getPatientHistory);

module.exports = router;