require('dotenv').config({ path: '../.env' });
const supabase = require('../config/supabase');

async function checkAtencionesSN() {
  const { data, error } = await supabase
    .from('atenciones')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const problematic = data.filter(a => JSON.stringify(a).includes('S/N'));
  console.log('Atenciones containing "S/N":', problematic.length);
  problematic.forEach(a => {
    console.log(`ID: ${a.id}, Data: ${JSON.stringify(a)}`);
  });
}

checkAtencionesSN();
