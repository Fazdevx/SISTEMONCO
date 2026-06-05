const {
  processMammographyExcel,
  previewMammographyExcel
} = require('../services/excelService');

const importMammographyExcel = async (req, res) => {
  try {
    const result = await processMammographyExcel();
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const previewImport = async (req, res) => {
  try {
    const result = await previewMammographyExcel();
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  importMammographyExcel,
  previewImport
};
