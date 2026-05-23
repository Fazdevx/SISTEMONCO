require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function checkUnusualIds() {
  const { data, error } = await supabase
    .from('atenciones')
    .select('paciente_id')
    .lt('paciente_id', 1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Atenciones with paciente_id < 1:', data.length);
  data.forEach(a => {
    console.log(`Paciente ID: ${a.paciente_id}`);
  });
}

checkUnusualIds();
