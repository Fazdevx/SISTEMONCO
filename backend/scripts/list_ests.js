require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function listAll() {
  const { data, error } = await supabase.from('establecimientos').select('id, nombre');
  if (data) {
    console.log('Nombres e IDs en DB:');
    console.log(data.map(e => `${e.id}: ${e.nombre}`));
    console.log('Total en DB:', data.length);
  }
}

listAll();
