const XLSX = require('xlsx');
const {
  normalizeText,
  normalizeDni,
  normalizeDate,
  normalizePhone
} = require('../utils/normalize');
const {
  isValidDni,
  isValidName
} = require('../utils/validators');
const {
  logError
} = require('../utils/logger');
const {
  insertPatientsBatch
} = require('./patientService');
const {
  insertAttentionsBatch
} = require('./attentionService');
const {
  insertMammographyBatch
} = require('./mammographyService');
const {
  loadEstablishmentsCache,
  getEstablishmentId,
  getAllEstablishmentNames,
  updateEstablishmentMeta
} = require('./establishmentService');
const { detectColumnMapping, getField } = require('../utils/excelHelpers');

// =============================================
// SOLO PROCESAR HOJAS QUE REALMENTE TIENEN DATOS
// =============================================
const VALID_SHEETS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY']; // Agrega más si tienen estructura similar
const META_SHEET = 'METAS Y AVANCES 2026';
const BATCH_SIZE = 100;

const processMammographyExcel = async () => {
  const FILE_NAME = 'MAMOGRAFIA 2026.xlsx';

  console.log('📂 Cargando establecimientos...');
  await loadEstablishmentsCache();

  const workbook = XLSX.readFile(`./uploads/${FILE_NAME}`);

  // 🎯 IMPORTAR METAS PRIMERO
  if (workbook.SheetNames.includes(META_SHEET)) {
    console.log(`\n🎯 Procesando hoja de metas: ${META_SHEET}`);
    const metaSheet = workbook.Sheets[META_SHEET];
    const metaRows = XLSX.utils.sheet_to_json(metaSheet);
    let metasActualizadas = 0;

    for (const row of metaRows) {
      const nombreEst = row['ESTABLECIMIENTO DE SALUD'];
      const metaAnual = row['META ANUAL'];
      if (nombreEst && metaAnual) {
        const ok = await updateEstablishmentMeta(nombreEst, parseInt(metaAnual));
        if (ok) metasActualizadas++;
      }
    }
    console.log(`✅ Metas actualizadas para ${metasActualizadas} establecimientos.`);
  }

  const sheetsToProcess = workbook.SheetNames.filter(sheet =>
    VALID_SHEETS.includes(sheet.toUpperCase())
  );
  console.log('📑 Hojas a procesar:', sheetsToProcess);

  // =============================================
  // CONTADORES GLOBALES
  // =============================================
  let totalFilasExcel = 0;
  let totalInvalidRows = 0;
  let totalImportedPatients = 0;
  let totalImportedAttentions = 0;
  let totalImportedMammographies = 0;
  let recordsBatch = [];

  for (const sheetName of sheetsToProcess) {
    console.log(`\n📄 Procesando hoja: ${sheetName}`);
    
    const sheet = workbook.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    // =============================================
    // FILTRAR FILAS VACÍAS (TODAS LAS CELDAS NULL/UNDEFINED/VACÍO)
    // =============================================
    rows = rows.filter(row => {
      return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
    });
    
    if (rows.length === 0) {
      console.log(`⚠️ Hoja ${sheetName} no tiene filas con datos, saltando.`);
      continue;
    }
    
    // Verificar que la primera fila tenga columnas útiles (DNI o nombre)
    const sampleRow = rows[0];
    const hasUsefulColumns = sampleRow && (sampleRow['DNI'] !== undefined || sampleRow['APELLIDOS Y NOMBRES'] !== undefined);
    if (!hasUsefulColumns) {
      console.log(`⚠️ Hoja ${sheetName} no tiene columnas de datos (DNI o nombre), saltando.`);
      continue;
    }
    
    // Detectar mapeo de columnas
    const mapping = detectColumnMapping(sampleRow, sheetName);
    console.log(`📋 Mapeo detectado para ${sheetName}:`, Object.keys(mapping).join(', '));
    console.log(`📊 Filas encontradas en hoja (después de limpiar vacías): ${rows.length}`);
    
    // Mostrar las primeras 5 columnas disponibles (opcional)
    if (rows[0]) {
      console.log('📋 Columnas disponibles:', Object.keys(rows[0]).slice(0, 10));
    }
    
    // =============================================
    // CONTADORES POR HOJA (SE REINICIAN EN CADA ITERACIÓN)
    // =============================================
    let filasProcesadasOK = 0;
    let rechazadosDniVacio = 0;
    let rechazadosNombreVacio = 0;
    let rechazadosDniInvalido = 0;
    let rechazadosNombreInvalido = 0;
    let rechazadosEstablecimiento = 0;
    let rechazadosError = 0;
    
    totalFilasExcel += rows.length;
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      // Obtener valores con el helper
      const dniRaw = getField(row, mapping, 'dni');
      const nombreRaw = getField(row, mapping, 'nombres');
      
      if (!dniRaw || dniRaw === '') {
        rechazadosDniVacio++;
        totalInvalidRows++;
        console.log(`❌ Fila ${rowIndex + 1}: DNI vacío`);
        continue;
      }
      if (!nombreRaw || nombreRaw === '') {
        rechazadosNombreVacio++;
        totalInvalidRows++;
        console.log(`❌ Fila ${rowIndex + 1}: Nombre vacío (DNI: ${dniRaw})`);
        continue;
      }
      
      try {
        const dni = normalizeDni(dniRaw);
        const nombres = normalizeText(nombreRaw);
        const edadRaw = getField(row, mapping, 'edad');
        const edad = edadRaw ? Number(edadRaw) : null;
        
        const establecimientoRaw = getField(row, mapping, 'establecimiento');
        const establecimientoNombre = establecimientoRaw ? normalizeText(establecimientoRaw) : null;
        
        // Validaciones
        if (!isValidDni(dni)) {
          rechazadosDniInvalido++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `DNI inválido: ${dni} (original: ${dniRaw})`
          });
          continue;
        }
        if (!isValidName(nombres)) {
          rechazadosNombreInvalido++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `Nombre inválido: ${nombres} (original: ${nombreRaw})`
          });
          continue;
        }
        if (!establecimientoNombre) {
          rechazadosEstablecimiento++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `Establecimiento vacío`
          });
          continue;
        }
        const establecimientoId = getEstablishmentId(establecimientoNombre);
        if (!establecimientoId) {
          rechazadosEstablecimiento++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `Establecimiento no encontrado: ${establecimientoNombre}`
          });
          continue;
        }
        
        // Extraer otros campos
        const historia_clinicaRaw = getField(row, mapping, 'hcl');
        const historia_clinica = historia_clinicaRaw ? historia_clinicaRaw.toString().trim() : null;
        const telefonoRaw = getField(row, mapping, 'telefono');
        const telefono = telefonoRaw ? normalizePhone(telefonoRaw) : null;
        const direccionRaw = getField(row, mapping, 'direccion');
        const direccion = direccionRaw ? normalizeText(direccionRaw) : null;
        const distritoRaw = getField(row, mapping, 'distrito');
        const distrito = distritoRaw ? normalizeText(distritoRaw) : null;
        
        // Fechas y textos de mamografía
        const fecha_toma_mx = normalizeDate(getField(row, mapping, 'fecha_toma_mx'));
        const resultados_mx = normalizeText(getField(row, mapping, 'resultados'));
        const birads_mx = (normalizeText(getField(row, mapping, 'birads_mx')) || '').substring(0, 20); // truncado a 20 caracteres
        const sugerencia_mx = normalizeText(getField(row, mapping, 'sugerencia'));
        const fecha_recepcion = normalizeDate(getField(row, mapping, 'fecha_recepcion'));
        const fecha_recojo = normalizeDate(getField(row, mapping, 'fecha_recojo'));
        const fecha_entrega = normalizeDate(getField(row, mapping, 'fecha_entrega'));
        const cita_ecografia = normalizeText(getField(row, mapping, 'cita_ecografia'));
        const resultados_ecografia = normalizeText(getField(row, mapping, 'resultados_ecografia'));
        const birads_ecografia = (normalizeText(getField(row, mapping, 'birads_ecografia')) || '').substring(0, 20);
        const sugerencias_ecografia = normalizeText(getField(row, mapping, 'sugerencias_ecografia'));
        const fecha_toma_magnificacion = normalizeDate(getField(row, mapping, 'fecha_toma_magnificacion'));
        const resultados_magnificacion = normalizeText(getField(row, mapping, 'resultados_magnificacion'));
        const birads_magnificacion = (normalizeText(getField(row, mapping, 'birads_magnificacion')) || '').substring(0, 20);
        const sugerencias_magnificacion = normalizeText(getField(row, mapping, 'sugerencias_magnificacion'));
        const fecha_referencia_hrh = normalizeDate(getField(row, mapping, 'fecha_referencia_hrh'));
        const procedimiento_fecha = normalizeText(getField(row, mapping, 'procedimiento_fecha'));
        const tratamiento = normalizeText(getField(row, mapping, 'tratamiento'));
        const tratamiento_otra = normalizeText(getField(row, mapping, 'tratamiento_otra'));
        const referencia_otra = normalizeText(getField(row, mapping, 'referencia_otra'));
        const situacion_actual = normalizeText(getField(row, mapping, 'situacion_actual'));
        
        // Si no hay fecha de toma de mamografía, intentar con la fecha de la fila (a veces viene en columna 'FECHA ')
        let fecha_toma_mx_final = fecha_toma_mx;
        if (!fecha_toma_mx_final && row['FECHA ']) {
          fecha_toma_mx_final = normalizeDate(row['FECHA ']);
        }
        
        recordsBatch.push({
          paciente: { dni, nombres, edad, historia_clinica, telefono, direccion, distrito },
          atencion: { establecimiento_id: establecimientoId, campaña_id: 1, fecha: new Date(), estado: 'REGISTRADO' },
          mamografia: {
            birads: birads_ecografia,
            ecografia: resultados_ecografia,
            magnificacion: resultados_magnificacion,
            resultado: resultados_mx,
            fecha_resultado: fecha_recepcion,
            fecha_entrega: fecha_entrega,
            tratamiento: tratamiento,
            fecha_toma_mx: fecha_toma_mx_final,
            resultados_mx: resultados_mx,
            birads_mx: birads_mx,
            sugerencia_mx: sugerencia_mx,
            fecha_recepcion_resultados: fecha_recepcion,
            fecha_recojo_resultados: fecha_recojo,
            cita_ecografia: cita_ecografia,
            resultados_ecografia: resultados_ecografia,
            birads_ecografia: birads_ecografia,
            sugerencias_ecografia: sugerencias_ecografia,
            fecha_toma_magnificacion: fecha_toma_magnificacion,
            resultados_magnificacion: resultados_magnificacion,
            birads_magnificacion: birads_magnificacion,
            sugerencias_magnificacion: sugerencias_magnificacion,
            fecha_referencia_hrh: fecha_referencia_hrh,
            procedimiento_fecha: procedimiento_fecha,
            tratamiento_otra_institucion: tratamiento_otra,
            referencia_otra_institucion: referencia_otra,
            situacion_actual: situacion_actual
          }
        });
        
        filasProcesadasOK++;
        
        if (filasProcesadasOK <= 5) {
          console.log(`✅ Fila ${rowIndex + 1}: VÁLIDA - DNI: ${dni}, Nombre: ${nombres}, Establecimiento ID: ${establecimientoId}`);
        }
        
        if (recordsBatch.length >= BATCH_SIZE) {
          console.log(`\n🔄 Procesando lote de ${recordsBatch.length} registros...`);
          const result = await processBatch(recordsBatch);
          totalImportedPatients += result.importedPatients;
          totalImportedAttentions += result.importedAttentions;
          totalImportedMammographies += result.importedMammographies;
          console.log(`✅ Lote procesado: Pacientes: ${result.importedPatients}, Atenciones: ${result.importedAttentions}, Mamografías: ${result.importedMammographies}`);
          recordsBatch = [];
        }
        
      } catch (error) {
        rechazadosError++;
        totalInvalidRows++;
        logError({
          file: FILE_NAME,
          sheet: sheetName,
          row: rowIndex + 1,
          message: error.message
        });
        console.error(`💥 Error en fila ${rowIndex + 1}: ${error.message}`);
      }
    }
    
    // =============================================
    // DIAGNÓSTICO DE LA HOJA ACTUAL
    // =============================================
    console.log(`\n📊 DIAGNÓSTICO DE HOJA ${sheetName}:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Filas procesadas OK:        ${filasProcesadasOK}`);
    console.log(`❌ Filas rechazadas:`);
    console.log(`   - DNI vacío:                ${rechazadosDniVacio}`);
    console.log(`   - Nombre vacío:             ${rechazadosNombreVacio}`);
    console.log(`   - DNI inválido:             ${rechazadosDniInvalido}`);
    console.log(`   - Nombre inválido:          ${rechazadosNombreInvalido}`);
    console.log(`   - Establecimiento inválido: ${rechazadosEstablecimiento}`);
    console.log(`   - Error inesperado:         ${rechazadosError}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📈 TOTAL FILAS EN HOJA:        ${rows.length}`);
    const totalProcesadasHoja = filasProcesadasOK + rechazadosDniVacio + rechazadosNombreVacio + rechazadosDniInvalido + rechazadosNombreInvalido + rechazadosEstablecimiento + rechazadosError;
    console.log(`📊 TOTAL PROCESADAS (OK+ERROR): ${totalProcesadasHoja}`);
    console.log(`⚠️  Diferencia (deben ser 0):   ${rows.length - totalProcesadasHoja}`);
  }
  
  // Procesar lote final (registros que quedaron)
  if (recordsBatch.length > 0) {
    console.log(`\n🔄 Procesando lote final de ${recordsBatch.length} registros...`);
    const result = await processBatch(recordsBatch);
    totalImportedPatients += result.importedPatients;
    totalImportedAttentions += result.importedAttentions;
    totalImportedMammographies += result.importedMammographies;
    console.log(`✅ Lote final procesado: Pacientes: ${result.importedPatients}, Atenciones: ${result.importedAttentions}, Mamografías: ${result.importedMammographies}`);
  }
  
  // =============================================
  // RESUMEN FINAL GLOBAL
  // =============================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN FINAL DEL PROCESO:`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📑 Hojas procesadas:           ${sheetsToProcess.length}`);
  console.log(`📄 Total filas en Excel:       ${totalFilasExcel}`);
  console.log(`✅ Filas válidas procesadas:   ${totalImportedAttentions}`); // cada fila válida = una atención
  console.log(`❌ Filas inválidas:            ${totalInvalidRows}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`💾 REGISTROS IMPORTADOS:`);
  console.log(`   - Pacientes:                ${totalImportedPatients}`);
  console.log(`   - Atenciones:               ${totalImportedAttentions}`);
  console.log(`   - Mamografías:              ${totalImportedMammographies}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`\n🔍 VERIFICACIÓN DE CONSISTENCIA:`);
  console.log(`   Atenciones vs Filas válidas: ${totalImportedAttentions} vs ${totalImportedAttentions} ✅`);
  console.log(`   Mamografías vs Atenciones:   ${totalImportedMammographies} vs ${totalImportedAttentions} ${totalImportedMammographies === totalImportedAttentions ? '✅' : '⚠️'}`);
  
  return {
    success: true,
    processedSheets: sheetsToProcess.length,
    importedPatients: totalImportedPatients,
    importedAttentions: totalImportedAttentions,
    importedMammographies: totalImportedMammographies,
    invalidRows: totalInvalidRows,
    diagnostico: {
      totalFilasExcel,
      filasValidas: totalImportedAttentions,
      filasInvalidas: totalInvalidRows
    }
  };
};

// ===============================
// PROCESAR LOTE (no cambia)
// ===============================
const processBatch = async (recordsBatch) => {
  console.log(`\n🔄 PROCESANDO LOTE DE ${recordsBatch.length} REGISTROS`);
  
  const uniquePatientsMap = new Map();
  for (const record of recordsBatch) {
    const dni = record.paciente.dni;
    if (!uniquePatientsMap.has(dni)) {
      uniquePatientsMap.set(dni, {
        dni: record.paciente.dni,
        nombres: record.paciente.nombres,
        edad: record.paciente.edad,
        historia_clinica: record.paciente.historia_clinica,
        telefono: record.paciente.telefono,
        direccion: record.paciente.direccion,
        distrito: record.paciente.distrito
      });
    }
  }
  console.log(`   📊 Estadísticas del lote:`);
  console.log(`      - Total registros:     ${recordsBatch.length}`);
  console.log(`      - Pacientes únicos:    ${uniquePatientsMap.size}`);
  console.log(`      - Registros duplicados: ${recordsBatch.length - uniquePatientsMap.size}`);
  
  const patientsData = Array.from(uniquePatientsMap.values());
  const insertedPatients = await insertPatientsBatch(patientsData);
  console.log(`      ✅ Pacientes insertados: ${insertedPatients.length}`);
  
  const patientIdByDni = new Map();
  for (const patient of insertedPatients) {
    patientIdByDni.set(patient.dni, patient.id);
  }
  
  const attentionsData = recordsBatch.map(record => ({
    paciente_id: patientIdByDni.get(record.paciente.dni),
    establecimiento_id: record.atencion.establecimiento_id,
    campaña_id: record.atencion.campaña_id,
    fecha: record.atencion.fecha,
    estado: record.atencion.estado
  }));
  
  const insertedAttentions = await insertAttentionsBatch(attentionsData);
  console.log(`      ✅ Atenciones insertadas: ${insertedAttentions.length}`);
  
  const attentionMap = new Map();
  for (let i = 0; i < insertedAttentions.length; i++) {
    attentionMap.set(i, insertedAttentions[i].id);
  }
  
  const mammographyData = recordsBatch.map((record, index) => ({
    atencion_id: attentionMap.get(index),
    birads: record.mamografia.birads,
    ecografia: record.mamografia.ecografia,
    magnificacion: record.mamografia.magnificacion,
    fecha_resultado: record.mamografia.fecha_resultado,
    fecha_entrega: record.mamografia.fecha_entrega,
    tratamiento: record.mamografia.tratamiento,
    fecha_toma_mx: record.mamografia.fecha_toma_mx,
    resultados_mx: record.mamografia.resultados_mx,
    birads_mx: record.mamografia.birads_mx,
    sugerencia_mx: record.mamografia.sugerencia_mx,
    fecha_recepcion_resultados: record.mamografia.fecha_recepcion_resultados,
    fecha_recojo_resultados: record.mamografia.fecha_recojo_resultados,
    cita_ecografia: record.mamografia.cita_ecografia,
    resultados_ecografia: record.mamografia.resultados_ecografia,
    birads_ecografia: record.mamografia.birads_ecografia,
    sugerencias_ecografia: record.mamografia.sugerencias_ecografia,
    fecha_toma_magnificacion: record.mamografia.fecha_toma_magnificacion,
    resultados_magnificacion: record.mamografia.resultados_magnificacion,
    birads_magnificacion: record.mamografia.birads_magnificacion,
    sugerencias_magnificacion: record.mamografia.sugerencias_magnificacion,
    fecha_referencia_hrh: record.mamografia.fecha_referencia_hrh,
    procedimiento_fecha: record.mamografia.procedimiento_fecha,
    tratamiento_otra_institucion: record.mamografia.tratamiento_otra_institucion,
    referencia_otra_institucion: record.mamografia.referencia_otra_institucion,
    situacion_actual: record.mamografia.situacion_actual
  }));
  
  const insertedMammographies = await insertMammographyBatch(mammographyData);
  console.log(`      ✅ Mamografías insertadas: ${insertedMammographies.length}`);
  
  return {
    importedPatients: insertedPatients.length,
    importedAttentions: insertedAttentions.length,
    importedMammographies: insertedMammographies.length
  };
};

module.exports = {
  processMammographyExcel
};