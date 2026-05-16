const patientService = require('../services/patientService');
const supabase = require('../config/supabase');

const getPatientHistory = async (req, res) => {
  const { dni } = req.params;
  console.log('--- GET /api/patients/:dni/history ---');
  console.log('DNI recibido:', dni);
  try {
    
    // Validar que el DNI sea numérico para evitar errores de sintaxis en la DB
    if (!dni || isNaN(dni)) {
      return res.status(400).json({ error: 'DNI inválido' });
    }

    const cleanDni = dni.toString().trim();
    
    // Primero obtener el paciente para validar que existe
    const result = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', cleanDni)
      .limit(1);

    console.log('Resultado búsqueda paciente:', result);
    const { data: pacientes, error: pError } = result;

    if (pError) console.error('Error buscando paciente:', pError);
    const paciente = pacientes?.[0];

    if (!paciente) {
      console.warn('Paciente no encontrado para DNI:', cleanDni);
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Obtener todas las atenciones y detalles de mamografía de este paciente
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

    res.json({
      paciente,
      historial
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPatientHistory
};