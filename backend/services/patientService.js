// services/patientService.js
const supabase = require('../config/supabase');

const insertPatientsBatch = async (patientsData) => {
  if (!patientsData || patientsData.length === 0) {
    return [];
  }

  try {
    // Usar upsert de Supabase para manejar inserciones y actualizaciones en una sola llamada
    // onConflict: 'dni' le indica a Supabase que use el DNI para detectar duplicados
    const { data, error } = await supabase
      .from('pacientes')
      .upsert(
        patientsData.map(p => ({
          dni: p.dni,
          nombres: p.nombres,
          edad: p.edad || null,
          historia_clinica: p.historia_clinica || null,
          telefono: p.telefono || null,
          direccion: p.direccion || null,
          distrito: p.distrito || null
        })),
        { onConflict: 'dni' }
      )
      .select();

    if (error) throw error;
    
    console.log(`✅ Procesados ${data.length} pacientes vía upsert`);
    return data;
  } catch (error) {
    console.error('Error en insertPatientsBatch (upsert):', error);
    throw error;
  }
};

const updatePatient = async (id, updateData) => {
  const { error } = await supabase
    .from('pacientes')
    .update(updateData)
    .eq('id', id);
  if (error) throw error;
  return { success: true };
};

const getPatients = async (filters, page = 1, limit = 20) => {
  let query = supabase
    .from('pacientes')
    .select('*', { count: 'exact' });

  if (filters.search) {
    const q = `%${filters.search}%`;
    query = query.or(`dni.ilike.${q},nombres.ilike.${q}`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.range(from, to).order('nombres');

  if (error) throw error;
  return { data, total: count, page, limit };
};

const getPatientById = async (id) => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

module.exports = {
  insertPatientsBatch,
  updatePatient,
  getPatients,
  getPatientById
};