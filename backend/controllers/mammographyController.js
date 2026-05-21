const mammographyService = require('../services/mammographyService');

// GET /api/mammographies?page=1&limit=20&establecimiento_id=...
const listMammographies = async (req, res) => {
  try {
    let { page = 1, limit = 20, establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    
    console.log('--- listMammographies USER ---', { id: req.user.id, rol: req.user.rol, est: req.user.establecimiento_id });

    // Forzar filtros de seguridad según el rol
    const filters = { 
      fecha_inicio, 
      fecha_fin, 
      birads, 
      birads_mx, 
      dni, 
      soloPositivos: soloPositivos === 'true' 
    };

    if (req.user.rol === 'establecimiento') {
      filters.establecimiento_id = req.user.establecimiento_id;
    } else if (req.user.rol === 'microred') {
      filters.microred_id = req.user.microred_id;
    } else {
      // Si es admin, puede filtrar por lo que mande en el query
      filters.establecimiento_id = establecimiento_id;
    }

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

// POST /api/mammographies
const createMammography = async (req, res) => {
  try {
    const data = req.body;
    const result = await mammographyService.createMammography(data);
    res.status(201).json(result);
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
    console.log('--- getDashboardStats USER ---', { id: req.user.id, rol: req.user.rol, est: req.user.establecimiento_id });
    
    // Determinar filtros según el rol
    const filters = {
      establecimiento_id: req.user.rol === 'establecimiento' ? req.user.establecimiento_id : null,
      microred_id: req.user.rol === 'microred' ? req.user.microred_id : null
    };
    
    const stats = await mammographyService.getDashboardStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('--- ERROR EN DASHBOARD STATS ---');
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const exportMammographies = async (req, res) => {
  try {
    let { establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    
    const filters = { 
      fecha_inicio, 
      fecha_fin, 
      birads, 
      birads_mx, 
      dni, 
      soloPositivos: soloPositivos === 'true' 
    };

    if (req.user.rol === 'establecimiento') {
      filters.establecimiento_id = req.user.establecimiento_id;
    } else if (req.user.rol === 'microred') {
      filters.microred_id = req.user.microred_id;
    } else {
      filters.establecimiento_id = establecimiento_id;
    }
    
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
  createMammography,
  updateMammography,
  deleteMammography,
  getDashboardStats,
  exportMammographies
};