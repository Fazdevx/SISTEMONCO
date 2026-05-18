require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkEstablecimientos() {
  const { data, error } = await supabase.from('establecimientos').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columnas de establecimientos:', Object.keys(data[0]));
    console.log('Ejemplo de registro:', data[0]);
  } else {
    console.log('No se encontraron establecimientos.');
  }
}

checkEstablecimientos();
