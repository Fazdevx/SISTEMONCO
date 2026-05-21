// services/patientService.js
const supabase = require('../config/supabase');

const insertPatientsBatch = async (patientsData) => {
  if (!patientsData || patientsData.length === 0) {
    return [];
  }

  try {
    // Verificar qué pacientes ya existen
    const dnis = patientsData.map(p => p.dni);
    const { data: existingPatients } = await supabase
      .from('pacientes')
      .select('dni, id')
      .in('dni', dnis);

    const existingDnis = new Map();
    existingPatients?.forEach(p => {
      existingDnis.set(p.dni, p.id);
    });

    // Separar nuevos vs existentes
    const newPatients = patientsData.filter(p => !existingDnis.has(p.dni));
    const patientsToUpdate = patientsData.filter(p => existingDnis.has(p.dni));

    let insertedPatients = [];
    
    // ✅ INSERTAR NUEVOS PACIENTES CON TODOS LOS CAMPOS
    if (newPatients.length > 0) {
      const { data, error } = await supabase
        .from('pacientes')
        .insert(newPatients.map(p => ({
          dni: p.dni,
          nombres: p.nombres,
          edad: p.edad || null,
          historia_clinica: p.historia_clinica || null,
          telefono: p.telefono || null,
          direccion: p.direccion || null,
          distrito: p.distrito || null
        })))
        .select();

      if (error) throw error;
      insertedPatients.push(...data);
    }

    // ✅ ACTUALIZAR PACIENTES EXISTENTES CON DATOS FALTANTES
    for (const patient of patientsToUpdate) {
      const updates = {};
      if (patient.historia_clinica) updates.historia_clinica = patient.historia_clinica;
      if (patient.telefono) updates.telefono = patient.telefono;
      if (patient.direccion) updates.direccion = patient.direccion;
      if (patient.distrito) updates.distrito = patient.distrito;
      
      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('pacientes')
          .update(updates)
          .eq('dni', patient.dni)
          .select();
        
        if (!error && data) {
          insertedPatients.push(...data);
        }
      } else {
        insertedPatients.push({
          id: existingDnis.get(patient.dni),
          dni: patient.dni,
          nombres: patient.nombres
        });
      }
    }

    return insertedPatients;
  } catch (error) {
    console.error('Error en insertPatientsBatch:', error);
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

module.exports = {
  insertPatientsBatch,
  updatePatient
};