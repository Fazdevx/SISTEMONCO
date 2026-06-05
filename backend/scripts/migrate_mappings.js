require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

const mappings = [
  { nombre_excel: 'HOSPITAL REGIONAL DE HUACHO', establecimiento_id: 60 },
  { nombre_excel: 'HOSPITAL DE CHANCAY', establecimiento_id: 64 },
  { nombre_excel: 'HOSPITAL DE HUARAL', establecimiento_id: 65 },
  { nombre_excel: 'CENTRO BASE HUARAL', establecimiento_id: 67 },
  // Agregando otros comunes encontrados en scripts previos
  { nombre_excel: 'HOSPITAL GENERAL DE HUACHO', establecimiento_id: 60 },
  { nombre_excel: 'C S SAYAN', establecimiento_id: 25 },
  { nombre_excel: 'P SCARQUIN', establecimiento_id: 104 },
  { nombre_excel: 'C. S. VEGUETA', establecimiento_id: 8 },
  { nombre_excel: 'C. S. SAYAN', establecimiento_id: 25 },
  { nombre_excel: 'P. S. SAN JUDAS TADEO', establecimiento_id: 23 },
  { nombre_excel: 'P.S. IC. MARIATEGUI', establecimiento_id: 11 }
];

async function migrateMappings() {
  console.log('Migrando mapeos a la base de datos...');
  
  for (const mapping of mappings) {
    const { data, error } = await supabase
      .from('establecimiento_mapeos')
      .upsert(mapping, { onConflict: 'nombre_excel' });
    
    if (error) {
      console.error(`Error insertando ${mapping.nombre_excel}:`, error.message);
    } else {
      console.log(`✅ Mapeo insertado/actualizado: ${mapping.nombre_excel} -> ID ${mapping.establecimiento_id}`);
    }
  }
}

migrateMappings();
