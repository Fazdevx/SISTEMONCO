const supabase = require('../config/supabase');

// --- Establecimiento Mapeos ---
const listEstablecimientoMapeos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('establecimiento_mapeos')
      .select('*, establecimiento:establecimientos(nombre)')
      .order('nombre_excel');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createEstablecimientoMapeo = async (req, res) => {
  try {
    const { nombre_excel, establecimiento_id } = req.body;
    const { data, error } = await supabase
      .from('establecimiento_mapeos')
      .insert({ nombre_excel, establecimiento_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteEstablecimientoMapeo = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('establecimiento_mapeos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Excel Columna Mapeos ---
const listExcelColumnaMapeos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('excel_columna_mapeos')
      .select('*')
      .order('campo_sistema');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateExcelColumnaMapeo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres_posibles } = req.body;
    const { data, error } = await supabase
      .from('excel_columna_mapeos')
      .update({ nombres_posibles })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listEstablecimientoMapeos,
  createEstablecimientoMapeo,
  deleteEstablecimientoMapeo,
  listExcelColumnaMapeos,
  updateExcelColumnaMapeo
};
