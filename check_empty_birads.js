require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function checkEmptyBirads() {
  const { data, error } = await supabase
    .from('detalle_mamografia')
    .select('id, birads_mx');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const problematic = data.filter(m => m.birads_mx && m.birads_mx.trim().toUpperCase() === 'BI-RADS');
  console.log('Problematic birads_mx (only "BI-RADS"):', problematic.length);
  problematic.forEach(m => {
    console.log(`ID: ${m.id}`);
  });
}

checkEmptyBirads();
