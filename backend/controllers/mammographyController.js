const mammographyService = require('../services/mammographyService');

// GET /api/mammographies?page=1&limit=20&establecimiento_id=...
const listMammographies = async (req, res) => {
  try {
    const { page = 1, limit = 20, establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    
    // Validar establecimiento_id si viene en el query
    if (establecimiento_id && isNaN(establecimiento_id)) {
      return res.status(400).json({ error: 'establecimiento_id inválido' });
    }

    const filters = { establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos: soloPositivos === 'true' };
    const result = await mammographyService.getMammographies(filters, parseInt(page) || 1, parseInt(limit) || 20);
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
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
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
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
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
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
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
    console.error('--- ERROR EN DASHBOARD STATS ---');
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const exportMammographies = async (req, res) => {
  console.log('--- GET /api/mammographies/export ---');
  console.log('Query params:', req.query);
  try {
    const { establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    
    if (establecimiento_id && isNaN(establecimiento_id)) {
      return res.status(400).json({ error: 'establecimiento_id inválido' });
    }

    const filters = { establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos: soloPositivos === 'true' };
    
    // Obtenemos todos los registros sin paginación (limit muy alto)
    const result = await mammographyService.getMammographies(filters, 1, 5000);
    res.json(result.data);
  } catch (error) {
    console.error('--- ERROR EN EXPORT ---');
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listMammographies,
  getMammography,
  updateMammography,
  deleteMammography,
  getDashboardStats,
  exportMammographies
};