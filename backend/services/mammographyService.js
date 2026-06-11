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
  
  if (filters.mes) {
    // mes en formato YYYY-MM
    const startOfMonth = `${filters.mes}-01`;
    const date = new Date(startOfMonth);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    query = query.gte('atencion.fecha', startOfMonth).lte('atencion.fecha', endOfMonth);
  }
  
  if (filters.dni) {
    const q = `%${filters.dni}%`;
    query = query.or(`dni.ilike.${q},nombres.ilike.${q}`, { foreignTable: 'atenciones.pacientes' });
  }

  if (filters.soloPositivos) {
    // Filtro inclusivo para BI-RADS 4 (A, B, C)
    query = query.or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.4%,birads_mx.ilike.birads: 4%');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let { data, error, count } = await query.range(from, to).order('id', { ascending: false });

  if (error) {
    console.error('Error en getMammographies query:', error);
    throw error;
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
      const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?4[ABC]?/i;
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
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?4[ABC]?/i;
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
  try {
    const { establecimiento_id, microred_id, mes } = filters;
    const isAnual = mes === 'anual';
    
    const targetMes = isAnual ? null : (mes || new Date().toISOString().slice(0, 7));
    
    let startOfMonth, endOfMonth, prevMes, startOfPrevMonth, endOfPrevMonth;
    
    if (!isAnual) {
      const parts = targetMes.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      
      if (isNaN(year) || isNaN(month)) {
        throw new Error('Formato de mes inválido. Use YYYY-MM');
      }

      startOfMonth = `${targetMes}-01`;
      endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
      
      const prevMonthDate = new Date(year, month - 2, 1);
      prevMes = prevMonthDate.toISOString().slice(0, 7);
      startOfPrevMonth = `${prevMes}-01`;
      endOfPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    console.log('--- Stats Params ---', { startOfMonth, endOfMonth, targetMes });

    // 1. TOTALES ACUMULADOS
    let qTotal = supabase.from('atenciones').select('id, establecimiento:establecimientos!inner(microred_id)', { count: 'exact', head: true });
    if (establecimiento_id) qTotal = qTotal.eq('establecimiento_id', establecimiento_id);
    if (microred_id) qTotal = qTotal.eq('establecimiento.microred_id', microred_id);
    const { count: totalAtenciones, error: errTotal } = await qTotal;
    if (errTotal) throw new Error(`Error en totalAtenciones: ${errTotal.message}`);

    // 2. ESTADÍSTICAS DEL PERIODO
    let atencionesPeriodo = 0;
    let atencionesPrev = 0;
    
    if (isAnual) {
      atencionesPeriodo = totalAtenciones || 0;
    } else {
      // Mes actual
      let qMes = supabase.from('atenciones').select('id, establecimiento:establecimientos!inner(microred_id)', { count: 'exact', head: true }).gte('fecha', startOfMonth).lte('fecha', endOfMonth);
      if (establecimiento_id) qMes = qMes.eq('establecimiento_id', establecimiento_id);
      if (microred_id) qMes = qMes.eq('establecimiento.microred_id', microred_id);
      const { count: countMes, error: errMes } = await qMes;
      if (errMes) throw new Error(`Error en countMes: ${errMes.message}`);
      atencionesPeriodo = countMes || 0;

      // Mes anterior
      let qPrev = supabase.from('atenciones').select('id, establecimiento:establecimientos!inner(microred_id)', { count: 'exact', head: true }).gte('fecha', startOfPrevMonth).lte('fecha', endOfPrevMonth);
      if (establecimiento_id) qPrev = qPrev.eq('establecimiento_id', establecimiento_id);
      if (microred_id) qPrev = qPrev.eq('establecimiento.microred_id', microred_id);
      const { count: countPrev, error: errPrev } = await qPrev;
      if (errPrev) throw new Error(`Error en countPrev: ${errPrev.message}`);
      atencionesPrev = countPrev || 0;
    }

    const diferenciaPeriodo = atencionesPrev > 0 ? (((atencionesPeriodo - atencionesPrev) / atencionesPrev) * 100).toFixed(1) : (atencionesPeriodo > 0 ? 100 : 0);

    // 3. POSITIVAS DEL PERIODO (BI-RADS 4)
    let queryPos = supabase
      .from('detalle_mamografia')
      .select('birads_mx, atencion:atenciones!inner(fecha, establecimiento_id, establecimiento:establecimientos!inner(microred_id))')
      .or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.4%,birads_mx.ilike.birads: 4%');
    
    if (!isAnual) queryPos = queryPos.gte('atencion.fecha', startOfMonth).lte('atencion.fecha', endOfMonth);
    if (establecimiento_id) queryPos = queryPos.eq('atencion.establecimiento_id', establecimiento_id);
    if (microred_id) queryPos = queryPos.eq('atencion.establecimiento.microred_id', microred_id);
    
    const posRows = await fetchAllRows(queryPos);
    const totalPositivasPeriodo = posRows.length;

    // 4. ATENCIONES POR MES (Gráfico Tendencia)
    const today = new Date().toISOString().split('T')[0];
    let queryGraph = supabase
      .from('atenciones')
      .select('fecha, establecimiento:establecimientos!inner(microred_id)')
      .gte('fecha', isAnual ? '2026-01-01' : startOfMonth)
      .lte('fecha', today);
    
    if (!isAnual) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      queryGraph = queryGraph.gte('fecha', sixMonthsAgo.toISOString().split('T')[0]);
    }

    if (establecimiento_id) queryGraph = queryGraph.eq('establecimiento_id', establecimiento_id);
    if (microred_id) queryGraph = queryGraph.eq('establecimiento.microred_id', microred_id);
    
    const atencionesGraph = await fetchAllRows(queryGraph.order('fecha'));
    const mesesMap = {};
    atencionesGraph.forEach(row => {
      const m = row.fecha.slice(0, 7);
      mesesMap[m] = (mesesMap[m] || 0) + 1;
    });

    // 5. DISTRIBUCIÓN BI-RADS DEL PERIODO
    let queryBirads = supabase
      .from('detalle_mamografia')
      .select('birads_mx, atencion:atenciones!inner(fecha, establecimiento_id, establecimiento:establecimientos!inner(microred_id))');
    
    if (!isAnual) queryBirads = queryBirads.gte('atencion.fecha', startOfMonth).lte('atencion.fecha', endOfMonth);
    if (establecimiento_id) queryBirads = queryBirads.eq('atencion.establecimiento_id', establecimiento_id);
    if (microred_id) queryBirads = queryBirads.eq('atencion.establecimiento.microred_id', microred_id);
    
    const biradsRows = await fetchAllRows(queryBirads);
    const distribucionBirads = {};
    biradsRows.forEach(row => {
      let raw = (row.birads_mx || '').trim().toUpperCase();
      if (!raw) return;
      let label = raw;
      const match = raw.match(/BI-RADS\s*[:\s]*([0-6][ABC]?)/i);
      if (match) label = `BI-RADS ${match[1]}`;
      distribucionBirads[label] = (distribucionBirads[label] || 0) + 1;
    });

    // 6. PRODUCTIVIDAD Y TABLA DE AVANCE MENSUAL
    const { data: allEstsDB, error: errEsts } = await supabase
      .from('establecimientos')
      .select('id, nombre, meta_anual, microred_id, microred:microredes(nombre)');
    if (errEsts) throw new Error(`Error al obtener establecimientos: ${errEsts.message}`);

    let queryAllYear = supabase
      .from('atenciones')
      .select('establecimiento_id, fecha, establecimiento:establecimientos!inner(microred_id)')
      .gte('fecha', '2026-01-01')
      .lte('fecha', today);
    
    if (establecimiento_id) queryAllYear = queryAllYear.eq('establecimiento_id', establecimiento_id);
    if (microred_id) queryAllYear = queryAllYear.eq('establecimiento.microred_id', microred_id);
    
    const allYearAtenciones = await fetchAllRows(queryAllYear);

    const matrix = {}; 
    allYearAtenciones.forEach(att => {
      const estId = att.establecimiento_id;
      const mesKey = att.fecha.slice(0, 7);
      if (!matrix[estId]) matrix[estId] = {};
      matrix[estId][mesKey] = (matrix[estId][mesKey] || 0) + 1;
    });

    const availableMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

    const allEstablecimientos = (allEstsDB || [])
      .filter(est => {
        if (establecimiento_id) return est.id === parseInt(establecimiento_id);
        if (microred_id) return est.microred_id === parseInt(microred_id);
        return true;
      })
      .map(est => {
        const rowCounts = matrix[est.id] || {};
        const totalAnualReal = Object.values(rowCounts).reduce((a, b) => a + b, 0);
        const currentMonthCount = rowCounts[targetMes] || 0;
        const metaMensual = Math.round((est.meta_anual || 0) / 12);
        
        return {
          id: est.id,
          nombre: est.nombre,
          microred: est.microred?.nombre || 'SIN MICRORED',
          cantidad: isAnual ? totalAnualReal : currentMonthCount,
          meta_periodo: isAnual ? (est.meta_anual || 0) : metaMensual,
          meta_anual: est.meta_anual || 0,
          avance_mensual: availableMonths.map(m => rowCounts[m] || 0)
        };
      }).sort((a, b) => b.cantidad - a.cantidad);

    return {
      mesSeleccionado: isAnual ? 'Anual 2026' : targetMes,
      isAnual,
      totalAtencionesAcumulado: totalAtenciones || 0,
      atencionesMes: atencionesPeriodo,
      atencionesPrev,
      diferenciaMes: diferenciaPeriodo,
      totalPositivasMes: totalPositivasPeriodo,
      atencionesPorMes: Object.entries(mesesMap).map(([mes, cantidad]) => ({ mes, cantidad })),
      distribucionBirads,
      topEstablecimientos: allEstablecimientos.slice(0, 5),
      allEstablecimientos,
      establecimientosList: (allEstsDB || []).map(e => ({ id: e.id, nombre: e.nombre })).sort((a,b) => a.nombre.localeCompare(b.nombre)),
      availableMonths
    };
  } catch (error) {
    console.error('--- Error Crítico en getDashboardStats ---', error);
    throw error;
  }
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
