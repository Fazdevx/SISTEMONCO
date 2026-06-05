require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkColumns() {
  const { data, error } = await supabase.from('detalle_mamografia').select('*').limit(1);
  if (data && data[0]) {
    console.log('Columnas encontradas:', Object.keys(data[0]));
    console.log('Valores ejemplo:', data[0]);
  } else {
    console.log('No se pudo obtener registro. Error:', error);
  }
}

checkColumns();
