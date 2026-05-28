// services/mammographyService.js
const supabase = require('../config/supabase');
const { notifyPositiveCases } = require('./notificationService');

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
  console.log('--- getMammographies FILTERS ---', filters);
  
  let query = supabase
    .from('detalle_mamografia')
    .select(`
      *,
      atencion:atenciones!inner(
        *,
        establecimiento:establecimientos(nombre, microred_id),
        paciente:pacientes!inner(*)
      )
    `, { count: 'exact' });

  // Aplicar filtros de seguridad (obligatorios si vienen en filters)
  if (filters.establecimiento_id) {
    query = query.eq('atencion.establecimiento_id', filters.establecimiento_id);
  } else if (filters.microred_id) {
    query = query.eq('atencion.establecimiento.microred_id', filters.microred_id);
  }

  // Aplicar otros filtros opcionales
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
    query = query.or(`dni.ilike.${q},nombres.ilike.${q}`, { foreignTable: 'atenciones.pacientes' });
  }

  if (filters.soloPositivos) {
    // Filtro inclusivo para 4, 5 y 6 en varios formatos
    query = query.or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.BI-RADS 5%,birads_mx.ilike.BI-RADS 6%,birads_mx.ilike.4%,birads_mx.ilike.5%,birads_mx.ilike.6%,birads_mx.ilike.birads: 4%,birads_mx.ilike.birads: 5%,birads_mx.ilike.birads: 6%');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error en getMammographies query:', error);
    throw error;
  }

  if (filters.soloPositivos) {
    const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
    data = (data || []).filter(r => POSITIVOS_REGEX.test((r.birads_mx || '').trim()));
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
        *,
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
  console.log('--- updateMammography updateData ---', updateData);
  const { atencion, paciente, ...mammoData } = updateData;

  // Si vienen datos planos (compatibilidad con frontend actual)
  let finalMammoData = { ...mammoData };
  let finalAtencion = atencion || null;
  let finalPaciente = paciente || null;

  // Si es un objeto plano desde el modal
  if (!atencion && !paciente && updateData.dni) {
    // Buscar la mamografía actual para obtener IDs
    const current = await getMammographyById(id);
    if (current) {
      finalAtencion = {
        id: current.atencion_id,
        fecha: updateData.fecha,
        establecimiento_id: updateData.establecimiento_id || null
      };
      finalPaciente = {
        id: current.atencion?.paciente?.id,
        dni: updateData.dni,
        nombres: updateData.nombres
      };
      
      // Limpiar campos que no van en detalle_mamografia
      delete finalMammoData.dni;
      delete finalMammoData.nombres;
      delete finalMammoData.fecha;
      delete finalMammoData.establecimiento_id;
      
      // Sincronizar birads_mx con birads
      // Si el usuario envió 'birads' (el número), actualizamos 'birads_mx' (el texto)
      if (updateData.birads !== undefined) {
        finalMammoData.birads = updateData.birads;
        if (updateData.birads) {
          finalMammoData.birads_mx = `BI-RADS ${updateData.birads}`;
        } else {
          finalMammoData.birads_mx = null;
        }
      }
    } else {
      throw new Error('No se encontró el registro de mamografía a actualizar');
    }
  }

  // Actualizar paciente si se envía información
  if (finalPaciente && finalPaciente.id) {
    const { id: pId, ...pData } = finalPaciente;
    const { error: pacienteError } = await supabase
      .from('pacientes')
      .update(pData)
      .eq('id', pId);
    if (pacienteError) throw pacienteError;
  }

  // Actualizar atención
  if (finalAtencion && finalAtencion.id) {
    const { id: aId, ...aData } = finalAtencion;
    const { error: atencionError } = await supabase
      .from('atenciones')
      .update(aData)
      .eq('id', aId);
    if (atencionError) throw atencionError;
  }

  // Actualizar detalle mamografía
  if (Object.keys(finalMammoData).length > 0) {
    const { error: mammoError } = await supabase
      .from('detalle_mamografia')
      .update(finalMammoData)
      .eq('id', id);
    if (mammoError) throw mammoError;

    // 🔔 Notificar si el BI-RADS actualizado es positivo
    if (finalMammoData.birads_mx) {
      const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
      if (POSITIVOS_REGEX.test(finalMammoData.birads_mx)) {
        // Obtener datos del paciente para el correo
        const current = await getMammographyById(id);
        const positiveCase = [{
          dni: current.atencion?.paciente?.dni,
          nombres: current.atencion?.paciente?.nombres,
          birads_mx: finalMammoData.birads_mx
        }];
        notifyPositiveCases(positiveCase).catch(err => console.error('Error enviando notificación (update):', err));
      }
    }
  }

  return { success: true };
};

const createMammography = async (data) => {
  console.log('--- createMammography data ---', data);
  const { dni, nombres, fecha, establecimiento_id, birads, resultados_mx, sugerencia_mx } = data;

  // 1. Buscar o Crear Paciente
  let pacienteId;
  const { data: existingPaciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('dni', dni)
    .single();

  if (existingPaciente) {
    pacienteId = existingPaciente.id;
    // Opcional: actualizar nombre si cambió
    await supabase.from('pacientes').update({ nombres }).eq('id', pacienteId);
  } else {
    const { data: newPaciente, error: pError } = await supabase
      .from('pacientes')
      .insert({ dni, nombres })
      .select()
      .single();
    if (pError) throw pError;
    pacienteId = newPaciente.id;
  }

  // 2. Crear Atención
  const { data: newAtencion, error: aError } = await supabase
    .from('atenciones')
    .insert({
      paciente_id: pacienteId,
      establecimiento_id: establecimiento_id || null,
      fecha: fecha || new Date().toISOString().split('T')[0],
      estado: 'REGISTRADO',
      campaña_id: 1
    })
    .select()
    .single();
  if (aError) throw aError;

  // 3. Crear Detalle Mamografía
  const { data: newMammo, error: mError } = await supabase
    .from('detalle_mamografia')
    .insert({
      atencion_id: newAtencion.id,
      birads,
      birads_mx: birads ? `BI-RADS ${birads}` : null,
      resultados_mx,
      sugerencia_mx
    })
    .select()
    .single();
  if (mError) throw mError;

  // 🔔 Notificar si es un caso positivo
  const birads_mx = birads ? `BI-RADS ${birads}` : null;
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
  if (birads_mx && POSITIVOS_REGEX.test(birads_mx)) {
    const positiveCase = [{
      dni,
      nombres,
      birads_mx
    }];
    notifyPositiveCases(positiveCase).catch(err => console.error('Error enviando notificación (create):', err));
  }

  return newMammo;
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

// Helper: Supabase devuelve máximo 1000 filas por defecto.
const fetchAllRows = async (queryBuilder) => {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }
  return allData;
};

const getDashboardStats = async (filters = {}) => {
  const { establecimiento_id, microred_id } = filters;

  // Total atenciones
  let query1 = supabase.from('atenciones').select('*', { count: 'exact', head: true });
  if (establecimiento_id) query1 = query1.eq('establecimiento_id', establecimiento_id);
  
  if (microred_id) {
    query1 = supabase
      .from('atenciones')
      .select('id, establecimiento:establecimientos!inner(microred_id)', { count: 'exact', head: true })
      .eq('establecimiento.microred_id', microred_id);
  }

  const { count: totalAtenciones, error: err1 } = await query1;
  if (err1) throw err1;

  // Total pacientes únicos
  let finalTotalPacientes = 0;
  if (establecimiento_id || microred_id) {
    let queryPacs = supabase.from('atenciones').select('paciente_id');
    if (establecimiento_id) queryPacs = queryPacs.eq('establecimiento_id', establecimiento_id);
    if (microred_id) {
      queryPacs = supabase.from('atenciones')
                 .select('paciente_id, establecimiento:establecimientos!inner(microred_id)')
                 .eq('establecimiento.microred_id', microred_id);
    }
    const pacs = await fetchAllRows(queryPacs);
    finalTotalPacientes = new Set(pacs.map(p => p.paciente_id)).size;
  } else {
    const { count, error: err2 } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true });
    if (err2) throw err2;
    finalTotalPacientes = count;
  }

  // Total positivas
  let query3 = supabase
    .from('detalle_mamografia')
    .select(`
      birads_mx,
      atencion:atenciones!inner(
        establecimiento_id,
        establecimiento:establecimientos(microred_id),
        paciente:pacientes(dni)
      )
    `)
    .or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.BI-RADS 5%,birads_mx.ilike.BI-RADS 6%,birads_mx.ilike.4%,birads_mx.ilike.5%,birads_mx.ilike.6%');
  
  if (establecimiento_id) {
    query3 = query3.eq('atencion.establecimiento_id', establecimiento_id);
  } else if (microred_id) {
    query3 = query3.eq('atencion.establecimiento.microred_id', microred_id);
  }
  
  const biradsPositivos = await fetchAllRows(query3);
  
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
  const seenDnis = new Set();
  (biradsPositivos || []).forEach(r => {
    if (POSITIVOS_REGEX.test((r.birads_mx || '').trim())) {
      const dni = r.atencion?.paciente?.dni;
      if (dni) seenDnis.add(dni);
    }
  });
  const totalPositivas = seenDnis.size;

  const porcentajePositivas = totalAtenciones ? ((totalPositivas / totalAtenciones) * 100).toFixed(2) : 0;

  // Atenciones por mes
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  let query4 = supabase
    .from('atenciones')
    .select('fecha, establecimiento:establecimientos(microred_id)')
    .gte('fecha', sixMonthsAgo.toISOString().split('T')[0])
    .order('fecha');
  
  if (establecimiento_id) {
    query4 = query4.eq('establecimiento_id', establecimiento_id);
  } else if (microred_id) {
    query4 = supabase
      .from('atenciones')
      .select('fecha, establecimiento:establecimientos!inner(microred_id)')
      .gte('fecha', sixMonthsAgo.toISOString().split('T')[0])
      .eq('establecimiento.microred_id', microred_id)
      .order('fecha');
  }

  const atencionesPorMesArray = await fetchAllRows(query4);
  const meses = {};
  atencionesPorMesArray.forEach(row => {
    const mes = row.fecha.slice(0, 7);
    meses[mes] = (meses[mes] || 0) + 1;
  });

  // Distribución BI-RADS
  let query5 = supabase
    .from('detalle_mamografia')
    .select(`
      birads_mx,
      atencion:atenciones!inner(
        establecimiento_id,
        establecimiento:establecimientos(microred_id)
      )
    `);
  if (establecimiento_id) {
    query5 = query5.eq('atencion.establecimiento_id', establecimiento_id);
  } else if (microred_id) {
    query5 = query5.eq('atencion.establecimiento.microred_id', microred_id);
  }
  
  const biradsDist = await fetchAllRows(query5);
  const distribucionBirads = {};
  biradsDist.forEach(row => {
    let raw = (row.birads_mx || '').trim().toUpperCase();
    if (!raw) return;
    let label = raw;
    const match = raw.match(/BI-RADS\s*[:\s]*([0-6][ABC]?)/i);
    if (match) label = `BI-RADS ${match[1]}`;
    distribucionBirads[label] = (distribucionBirads[label] || 0) + 1;
  });

  // Establecimientos
  const { data: allEstsDB } = await supabase
    .from('establecimientos')
    .select('id, nombre, meta_anual, microred_id, microred:microredes(nombre)');

  let query7 = supabase.from('atenciones').select('establecimiento_id');
  if (establecimiento_id) query7 = query7.eq('establecimiento_id', establecimiento_id);
  const counts = await fetchAllRows(query7);

  const atencionesMap = {};
  counts.forEach(c => {
    if (c.establecimiento_id) atencionesMap[c.establecimiento_id] = (atencionesMap[c.establecimiento_id] || 0) + 1;
  });

  const allEstablecimientos = allEstsDB
    .filter(est => {
      if (establecimiento_id) return est.id === parseInt(establecimiento_id);
      if (microred_id) return est.microred_id === parseInt(microred_id);
      return true;
    })
    .map(est => ({
      id: est.id,
      nombre: est.nombre,
      microred: est.microred?.nombre || 'SIN MICRORED',
      cantidad: atencionesMap[est.id] || 0,
      meta: est.meta_anual || 0
    })).sort((a, b) => b.cantidad - a.cantidad);

  return {
    totalAtenciones,
    totalPacientes: finalTotalPacientes,
    totalPositivas,
    porcentajePositivas,
    atencionesPorMes: Object.entries(meses).map(([mes, cantidad]) => ({ mes, cantidad })),
    distribucionBirads,
    topEstablecimientos: allEstablecimientos.slice(0, 5),
    allEstablecimientos
  };
};

module.exports = {
  insertMammographyBatch,
  getMammographies,
  getMammographyById,
  updateMammography,
  createMammography,
  deleteMammography,
  getDashboardStats
};
