const {
  processMammographyExcel
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

module.exports = {
  importMammographyExcel
};