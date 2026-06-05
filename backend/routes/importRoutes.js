const express = require('express');
const router = express.Router();

const {
  importMammographyExcel,
  previewImport
} = require('../controllers/importController');

router.post('/mammography', importMammographyExcel);
router.get('/preview', previewImport);

module.exports = router;