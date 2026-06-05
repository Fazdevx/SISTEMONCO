const patientService = require('../services/patientService');
const supabase = require('../config/supabase');

const getPatientHistory = async (req, res) => {
  const { dni } = req.params;
  try {
    if (!dni || isNaN(dni)) {
      return res.status(400).json({ error: 'DNI inválido' });
    }
    const cleanDni = dni.toString().trim();
    const { data: pacientes, error: pError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', cleanDni)
      .limit(1);

    if (pError) throw pError;
    const paciente = pacientes?.[0];

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const { data: historial, error: hError } = await supabase
      .from('detalle_mamografia')
      .select(`
        *,
        atencion:atenciones!inner(
          id,
          fecha,
          resultado_general,
          observaciones,
          establecimiento:establecimientos(nombre)
        )
      `)
      .eq('atencion.paciente_id', paciente.id)
      .order('atencion(fecha)', { ascending: false });

    if (hError) throw hError;
    res.json({ paciente, historial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const listPatients = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const result = await patientService.getPatients({ search }, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await patientService.updatePatient(id, updateData);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPatientHistory,
  listPatients,
  updatePatient
};
