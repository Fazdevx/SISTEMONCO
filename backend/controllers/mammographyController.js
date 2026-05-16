const mammographyService = require('../services/mammographyService');

// GET /api/mammographies?page=1&limit=20&establecimiento_id=...
const listMammographies = async (req, res) => {
  try {
    const { page = 1, limit = 20, establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    const filters = { establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos: soloPositivos === 'true' };
    const result = await mammographyService.getMammographies(filters, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/mammographies/:id
const getMammography = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await mammographyService.getMammographyById(parseInt(id));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/mammographies/:id
const updateMammography = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await mammographyService.updateMammography(parseInt(id), updateData);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/mammographies/:id
const deleteMammography = async (req, res) => {
  try {
    const { id } = req.params;
    await mammographyService.deleteMammography(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


// GET /api/stats/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const stats = await mammographyService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listMammographies,
  getMammography,
  updateMammography,
  deleteMammography,
  getDashboardStats
};