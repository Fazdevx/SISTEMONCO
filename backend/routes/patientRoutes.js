const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken, loadProfile } = require('../middleware/auth');

router.use(verifyToken);
router.use(loadProfile);

router.get('/:dni/history', patientController.getPatientHistory);

module.exports = router;