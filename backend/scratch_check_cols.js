require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'pacientes' });
  // Si no hay RPC, probamos otro método
  if (error) {
    const { data: one, error: e2 } = await supabase.from('pacientes').select('*').limit(1);
    if (one && one[0]) {
      console.log('Columnas encontradas:', Object.keys(one[0]));
    } else {
        console.log('No se pudo obtener registro. Error:', e2);
    }
  } else {
    console.log(data);
  }
}

checkColumns();
