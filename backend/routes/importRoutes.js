const express = require('express');
const router = express.Router();

const {
  importMammographyExcel
} = require('../controllers/importController');

router.post('/mammography', importMammographyExcel);

module.exports = router;