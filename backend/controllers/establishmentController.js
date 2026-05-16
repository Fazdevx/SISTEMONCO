// establishmentController.js
const supabase = require('../config/supabase');

const getMicroredes = async (req, res) => {
  const { data, error } = await supabase.from('microredes').select('*').order('nombre');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getEstablecimientos = async (req, res) => {
  let query = supabase.from('establecimientos').select('*, microred:microredes(nombre)').order('nombre');
  if (req.query.microred_id) {
    query = query.eq('microred_id', req.query.microred_id);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getMicroredes, getEstablecimientos };