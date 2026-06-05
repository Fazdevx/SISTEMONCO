require('dotenv').config();
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configuración directa para el script
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Mapeo de nombres (Copiado de establishmentService para consistencia)
const ESTABLISHMENT_MAPPING = {
  'HOSPITAL REGIONAL DE HUACHO': 'Hospital Regional Huacho',
  'HOSPITAL DE CHANCAY': 'Hospital de Chancay',
  'HOSPITAL DE HUARAL': 'Hospital de Huaral',
  'CENTRO BASE HUARAL': 'Centro Base Huaral',
  'C.S. EL SOCORRO': 'C.S. EL SOCORRO',
  'C. S. EL SOCORRO': 'C.S. EL SOCORRO',
  'C. S. VEGUETA': 'C.S. VEGUETA',
  'C. S. SAYAN': 'C.S. SAYAN',
  'P. S. SAN JUDAS TADEO': 'P.S. SAN JUDAS TADEO',
  'P.S. IC. MARIATEGUI': 'P.S. MARIATEGUI'
};

function normalizeName(name) {
  if (!name) return null;
  // Limpiar espacios y puntos para comparación robusta
  let cleaned = name.toString().trim().toUpperCase();
  
  // Normalización agresiva: remover puntos para comparar
  const simplify = (s) => s.replace(/\./g, '').replace(/\s+/g, ' ').trim();
  
  const simplifiedExcel = simplify(cleaned);
  
  // Intentar mapeo directo primero
  if (ESTABLISHMENT_MAPPING[cleaned]) return ESTABLISHMENT_MAPPING[cleaned];

  return cleaned;
}

async function importMetas() {
  const FILE_PATH = '../uploads/MAMOGRAFIA 2026.xlsx';
  const SHEET_NAME = 'METAS Y AVANCES 2026';

  console.log('🚀 Iniciando importación de METAS...');

  try {
    // 1. Cargar cache de establecimientos
    const { data: dbEsts, error: errEst } = await supabase.from('establecimientos').select('id, nombre');
    if (errEst) throw errEst;

    const estCache = new Map();
    // Guardamos versión simplificada para comparar
    const simplify = (s) => s.replace(/\./g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    dbEsts.forEach(e => estCache.set(simplify(e.nombre), e.id));
    console.log(`📦 Cache cargado: ${dbEsts.length} establecimientos.`);

    // 2. Leer Excel
    const workbook = XLSX.readFile(FILE_PATH);
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
      throw new Error(`No se encontró la hoja "${SHEET_NAME}"`);
    }

    const sheet = workbook.Sheets[SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`📄 Filas encontradas en Excel: ${rows.length}`);

    let actualizados = 0;
    let noEncontrados = 0;

    // 3. Procesar metas
    for (const row of rows) {
      const nombreExcel = row['ESTABLECIMIENTO DE SALUD'];
      const metaAnual = row['META ANUAL'];

      if (!nombreExcel || !metaAnual) continue;

      const simplifiedExcel = simplify(nombreExcel);
      let estId = estCache.get(simplifiedExcel);

      // Casos especiales manuales si falla el simplificado
      if (!estId) {
        if (simplifiedExcel === 'HOSPITAL GENERAL DE HUACHO') estId = estCache.get(simplify('HOSPITAL REGIONAL HUACHO'));
        if (simplifiedExcel === 'C S SAYAN') estId = estCache.get(simplify('C.S. SAYAN'));
        if (simplifiedExcel === 'P SCARQUIN') estId = estCache.get(simplify('P.S. CARQUIN'));
      }

      if (estId) {
        const { error: updErr } = await supabase
          .from('establecimientos')
          .update({ meta_anual: parseInt(metaAnual) })
          .eq('id', estId);

        if (updErr) {
          console.error(`❌ Error actualizando ${nombreExcel}:`, updErr.message);
        } else {
          actualizados++;
        }
      } else {
        noEncontrados++;
        if (!nombreExcel.includes('RED DE SALUD') && !nombreExcel.includes('MICRO RED')) {
          console.log(`⚠️ No encontrado en DB: "${nombreExcel}"`);
        }
      }
    }

    console.log('\n✨ PROCESO TERMINADO');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Metas actualizadas: ${actualizados}`);
    console.log(`⚠️ No encontrados:     ${noEncontrados}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  } catch (error) {
    console.error('💥 Error crítico:', error.message);
  }
}

importMetas();
