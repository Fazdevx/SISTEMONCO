require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function listAll() {
  const { data, error } = await supabase.from('establecimientos').select('nombre');
  if (data) {
    console.log('Nombres en DB (primeros 20):');
    console.log(data.slice(0, 20).map(e => e.nombre));
    console.log('Total en DB:', data.length);
  }
}

listAll();
