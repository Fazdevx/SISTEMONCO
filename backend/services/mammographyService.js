// services/mammographyService.js
const supabase = require('../config/supabase');

const insertMammographyBatch = async (mammographyData) => {
  if (!mammographyData || mammographyData.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('detalle_mamografia')
      .insert(mammographyData)
      .select();

    if (error) throw error;
    
    console.log(`✅ Insertadas ${data.length} detalle_mamografia`);
    return data;
  } catch (error) {
    console.error('❌ Error en insertMammographyBatch:', error.message);
    throw error;
  }
};

// Obtener listado de mamografías con paginación y filtros opcionales
const getMammographies = async (filters, page = 1, limit = 20) => {
  let query = supabase
    .from('detalle_mamografia')
    .select(`
      *,
      atencion:atenciones!inner(
        id,
        fecha,
        estado,
        establecimiento:establecimientos!inner(nombre),
        paciente:pacientes!inner(dni, nombres, edad, telefono, direccion, distrito)
      )
    `, { count: 'exact' });

  // Aplicar filtros
  if (filters.establecimiento_id) {
    query = query.eq('atencion.establecimiento_id', filters.establecimiento_id);
  }
  if (filters.fecha_inicio) {
    query = query.gte('atencion.fecha', filters.fecha_inicio);
  }
  if (filters.fecha_fin) {
    query = query.lte('atencion.fecha', filters.fecha_fin);
  }
  if (filters.birads) {
    query = query.eq('birads', filters.birads);
  }
  if (filters.birads_mx) {
    query = query.ilike('birads_mx', `%${filters.birads_mx}%`);
  }
  
  if (filters.dni) {
    const q = `%${filters.dni}%`;
    // Para evitar errores de PostgREST con OR en niveles profundos, 
    // usamos una aproximación compatible: filtramos por DNI si parece uno, 
    // o buscamos por nombre si es texto.
    if (/^\d+$/.test(filters.dni)) {
      query = query.ilike('atencion.paciente.dni', q);
    } else {
      query = query.ilike('atencion.paciente.nombres', q);
    }
  }

  if (filters.soloPositivos) {
    query = query.or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.4%,birads_mx.ilike.birads: 4%');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let { data, error, count } = await query.range(from, to);

  if (error) throw error;

  if (filters.soloPositivos) {
    // Filtrado riguroso en JS para evitar falsos positivos de fechas/descripciones
    const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
    data = (data || []).filter(r => POSITIVOS_REGEX.test((r.birads_mx || '').trim()));
    // Ajustamos el count para reflejar el filtrado manual (solo para esta vista)
    count = data.length;
  }

  return { data, total: count, page, limit };
};

// Obtener detalle completo de una mamografía por ID
const getMammographyById = async (id) => {
  const { data, error } = await supabase
    .from('detalle_mamografia')
    .select(`
      *,
      atencion:atenciones(
        id,
        fecha,
        estado,
        resultado_general,
        observaciones,
        establecimiento:establecimientos(*),
        paciente:pacientes(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Actualizar una mamografía (incluye datos de atención y paciente)
const updateMammography = async (id, updateData) => {
  const { atencion, paciente, ...mammoData } = updateData;

  // Actualizar paciente si se envía información
  if (paciente && paciente.id) {
    const { error: pacienteError } = await supabase
      .from('pacientes')
      .update(paciente)
      .eq('id', paciente.id);
    if (pacienteError) throw pacienteError;
  }

  // Actualizar atención
  if (atencion && atencion.id) {
    const { error: atencionError } = await supabase
      .from('atenciones')
      .update(atencion)
      .eq('id', atencion.id);
    if (atencionError) throw atencionError;
  }

  // Actualizar detalle mamografía
  const { error: mammoError } = await supabase
    .from('detalle_mamografia')
    .update(mammoData)
    .eq('id', id);
  if (mammoError) throw mammoError;

  return { success: true };
};

// Eliminar una mamografía (borrado físico en cascada)
const deleteMammography = async (id) => {
  // Primero obtener la atención_id para eliminar en orden
  const { data: mammo, error: fetchError } = await supabase
    .from('detalle_mamografia')
    .select('atencion_id')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  // Eliminar detalle mamografía
  const { error: delMammo } = await supabase
    .from('detalle_mamografia')
    .delete()
    .eq('id', id);
  if (delMammo) throw delMammo;

  // Eliminar atención (en cascada borraría referencias, si las hay)
  const { error: delAtencion } = await supabase
    .from('atenciones')
    .delete()
    .eq('id', mammo.atencion_id);
  if (delAtencion) throw delAtencion;

  // Nota: paciente no se elimina, queda histórico.
  return { success: true };
};

// services/mammographyService.js (añadir al final)

const getDashboardStats = async () => {
  // Total atenciones
  const { count: totalAtenciones, error: err1 } = await supabase
    .from('atenciones')
    .select('*', { count: 'exact', head: true });
  if (err1) throw err1;

  // Total pacientes únicos
  const { count: totalPacientes, error: err2 } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true });
  if (err2) throw err2;

  // Total positivas (pacientes únicos) - solo BI-RADS 4 en varios formatos
  const { data: biradsPositivos, error: err3 } = await supabase
    .from('detalle_mamografia')
    .select(`
      birads_mx,
      atencion:atenciones(
        paciente:pacientes(dni)
      )
    `)
    .or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.4%,birads_mx.ilike.birads: 4%');
  if (err3) throw err3;
  
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?4[ABC]?/i;
  const seenDnis = new Set();
  (biradsPositivos || []).forEach(r => {
    if (POSITIVOS_REGEX.test((r.birads_mx || '').trim())) {
      const dni = r.atencion?.paciente?.dni;
      if (dni) seenDnis.add(dni);
    }
  });
  const totalPositivas = seenDnis.size;

  const porcentajePositivas = totalAtenciones ? ((totalPositivas / totalAtenciones) * 100).toFixed(2) : 0;

  // Atenciones por mes (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const { data: atencionesPorMes, error: err4 } = await supabase
    .from('atenciones')
    .select('fecha')
    .gte('fecha', sixMonthsAgo.toISOString().split('T')[0])
    .order('fecha');
  if (err4) throw err4;

  const meses = {};
  atencionesPorMes.forEach(row => {
    const mes = row.fecha.slice(0, 7);
    meses[mes] = (meses[mes] || 0) + 1;
  });
  const atencionesPorMesArray = Object.entries(meses).map(([mes, cantidad]) => ({ mes, cantidad }));

  // Distribución BI-RADS - extraemos solo el número/categoría del texto 'BI-RADS X'
  const { data: biradsDist, error: err5 } = await supabase
    .from('detalle_mamografia')
    .select('birads_mx');
  if (err5) throw err5;
  const distribucionBirads = {};
  biradsDist.forEach(row => {
    let raw = (row.birads_mx || '').trim().toUpperCase();
    if (!raw) {
      distribucionBirads['SIN ESPECIFICAR'] = (distribucionBirads['SIN ESPECIFICAR'] || 0) + 1;
      return;
    }
    // Normalizar etiquetas comunes
    let label = raw;
    const match = raw.match(/BI-RADS\s*[:\s]*([0-6][ABC]?)/i);
    if (match) {
      label = `BI-RADS ${match[1]}`;
    } else if (/^[0-6][ABC]?$/.test(raw)) {
      label = `BI-RADS ${raw}`;
    }
    
    distribucionBirads[label] = (distribucionBirads[label] || 0) + 1;
  });

  // Obtener TODOS los establecimientos para cruzar con atenciones
  const { data: allEstsDB, error: err6 } = await supabase
    .from('establecimientos')
    .select('id, nombre, meta_anual');
  if (err6) throw err6;

  // Contar atenciones por establecimiento
  const { data: counts, error: err7 } = await supabase
    .from('atenciones')
    .select('establecimiento_id');
  if (err7) throw err7;

  const atencionesMap = {};
  counts.forEach(c => {
    if (c.establecimiento_id) {
      atencionesMap[c.establecimiento_id] = (atencionesMap[c.establecimiento_id] || 0) + 1;
    }
  });

  const allEstablecimientos = allEstsDB.map(est => ({
    nombre: est.nombre,
    cantidad: atencionesMap[est.id] || 0,
    meta: est.meta_anual || 0
  })).sort((a, b) => b.cantidad - a.cantidad);

  const topEstablecimientos = allEstablecimientos.slice(0, 5);

  return {
    totalAtenciones,
    totalPacientes,
    totalPositivas,
    porcentajePositivas,
    atencionesPorMes: atencionesPorMesArray,
    distribucionBirads,
    topEstablecimientos,
    allEstablecimientos
  };
};

module.exports = {
  insertMammographyBatch,
  getMammographies,
  getMammographyById,
  updateMammography,
  deleteMammography,
  getDashboardStats
};