// utils/excelHelpers.js

/**
 * Obtiene el primer valor no nulo/undefined de una lista de posibles nombres de columna.
 * @param {Object} row - Fila del Excel (objeto con columnas)
 * @param {Array<string>} possibleNames - Lista de nombres posibles (orden de preferencia)
 * @returns {any} - Valor encontrado o null
 */
const getColumn = (row, possibleNames) => {
  if (!row) return null;
  for (let name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null) {
      return row[name];
    }
  }
  return null;
};

/**
 * Detecta automáticamente el mapeo de columnas para una hoja dada,
 * basado en las columnas presentes.
 * @param {Object} rowSample - Una fila de muestra (primera fila con datos)
 * @param {string} sheetName - Nombre de la hoja (por si se requiere un caso especial)
 * @returns {Object} Mapeo de nombres de campos a lista de posibles nombres de columnas
 */
const detectColumnMapping = (rowSample, sheetName) => {
  const columns = Object.keys(rowSample || {});
  
  // Mapeo base (compatible con ENE)
  const mapping = {
    dni: ['DNI', 'DNI '],
    nombres: ['APELLIDOS Y NOMBRES', 'APELLIDOS Y NOMBRES '],
    edad: ['EDAD'],
    hcl: ['HCL', 'H. CL.', 'H.CL'],
    telefono: ['TELEFONO ', 'TELEFONO 1', 'TELEFONO'],
    direccion: ['DIRECCION', 'DIRECCIÓN'],
    distrito: ['DISTRITO'],
    establecimiento: ['EE SS ORIGEN', 'EE SS ORIGEN '],
    fecha_toma_mx: ['TOMA DE MX', 'TOMA DE MAMOGRAFIA', 'TOMA DE MX '],
    resultados: ['RESULTADOS'],
    birads_mx: ['BI- RADS', 'BI-RADS'],
    sugerencia: ['SUGERENCIA'],
    fecha_recepcion: ['FECHA DE RECEPCION DE RESULTADOS'],
    fecha_recojo: ['FECHA DE RECOJO DE RESULTADOS POR EESS', 'FECHA DE RECOJO'],
    fecha_entrega: ['FECHA DE ENTREGA DE RESULTADOS A PCT'],
    cita_ecografia: ['CITA ECOGRAFIA'],
    resultados_ecografia: ['RESULTADOS DE ECOGRAFIA'],
    birads_ecografia: ['BI-RADS', 'BI-RADS_1'],
    sugerencias_ecografia: ['SUGERENCIAS'],
    fecha_toma_magnificacion: ['FECHA TOMA DE MAGNIFICACION', 'FECHA TOMA MAGNIFICAION'],
    resultados_magnificacion: ['RESULTADOS DE MAGNIFICACION'],
    birads_magnificacion: ['BI-RADS_1', 'BI-RADS_2'],
    sugerencias_magnificacion: ['SUGERENCIAS_1', 'SUGERENCIAS_2'],
    fecha_referencia_hrh: ['FECHA DE REFERENCIA AL H.R.H'],
    procedimiento_fecha: ['PROCEDIMIENTO (FECHA)'],
    tratamiento: ['TRATAMIENTO (FECHA)'],
    tratamiento_otra: ['TRATAMIENTO EN OTRA INSTITUCION'],
    referencia_otra: ['REFERENCIA A OTRA INSTITUCIÓN (FECHA)'],
    situacion_actual: ['SITUACIÓN ACTUAL']
  };

  // Ajustes específicos por hoja
  if (sheetName === 'MAY') {
    mapping.fecha_toma_mx = ['TOMA DE MAMOGRAFIA', 'TOMA DE MX'];
    mapping.birads_mx = ['BI-RADS'];  // En MAY el primer BI-RADS es de mamografía
    mapping.birads_ecografia = ['BI-RADS_1', 'BI-RADS'];  // El segundo es ecografía
    mapping.hcl = ['H. CL.', 'HCL'];  // En MAY se llama 'H. CL.'
  }
  
  if (sheetName === 'ABR') {
    // ABR tiene una columna extra 'VERIFICACIÓN', pero no afecta
  }

  // Para hojas simples (JUN, JUL, etc.) no es necesario cambiar mapping,
  // ya que getColumn retornará null para campos que no existan.

  return mapping;
};

/**
 * Obtiene el valor de un campo usando el mapping detectado.
 * @param {Object} row - Fila
 * @param {Object} mapping - Mapeo de campos a lista de nombres posibles
 * @param {string} field - Nombre del campo
 * @returns {any}
 */
const getField = (row, mapping, field) => {
  const possibleNames = mapping[field];
  if (!possibleNames) return null;
  return getColumn(row, possibleNames);
};

module.exports = {
  getColumn,
  detectColumnMapping,
  getField
};