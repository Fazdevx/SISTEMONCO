require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function addSeguimientoColumns() {
  console.log('Intentando agregar columnas de seguimiento a detalle_mamografia...');
  
  const sql = `
    ALTER TABLE detalle_mamografia ADD COLUMN IF NOT EXISTS fue_llamado BOOLEAN DEFAULT FALSE;
    ALTER TABLE detalle_mamografia ADD COLUMN IF NOT EXISTS fue_referido BOOLEAN DEFAULT FALSE;
    ALTER TABLE detalle_mamografia ADD COLUMN IF NOT EXISTS fecha_biopsia DATE;
    ALTER TABLE detalle_mamografia ADD COLUMN IF NOT EXISTS notas_seguimiento TEXT;
  `;

  // Intentar ejecutar vía RPC 'exec_sql' si existe
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('No se pudo agregar las columnas vía RPC:', error.message);
    console.log('\n--- COPIA Y PEGA ESTE SQL EN EL SQL EDITOR DE SUPABASE ---');
    console.log(sql);
    console.log('----------------------------------------------------------\n');
  } else {
    console.log('Columnas agregadas exitosamente (o ya existían).');
  }
}

addSeguimientoColumns();
