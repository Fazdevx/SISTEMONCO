require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function addMetaColumn() {
  console.log('Intentando agregar columna meta_anual a establecimientos...');
  // Supabase JS client doesn't support ALTER TABLE directly. 
  // Usually we need to use the SQL Editor in Supabase UI or a migration.
  // However, I'll try to see if there's a way to run SQL or if I should just use what I have.
  
  // If I can't add the column, I might have to store metas in a JSON file or hardcoded for now,
  // but adding the column is the right way.
  
  // Let's try to use a common RPC if it exists (unlikely in default setups)
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE establecimientos ADD COLUMN IF NOT EXISTS meta_anual INTEGER DEFAULT 0;' });
  
  if (error) {
    console.error('No se pudo agregar la columna vía RPC:', error.message);
    console.log('Sugerencia: Agregar la columna meta_anual (INTEGER) manualmente en la tabla establecimientos.');
  } else {
    console.log('Columna agregada exitosamente (o ya existía).');
  }
}

addMetaColumn();
