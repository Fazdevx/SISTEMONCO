require('dotenv').config({ path: '../.env' });
const supabase = require('../config/supabase');

async function checkDuplicateDnis() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('dni');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const dnis = data.map(p => p.dni);
  const counts = {};
  dnis.forEach(d => {
    counts[d] = (counts[d] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([d, c]) => c > 1);
  console.log('Duplicate DNIs:', duplicates.length);
  duplicates.forEach(([d, c]) => {
    console.log(`DNI: ${d}, Count: ${c}`);
  });
}

checkDuplicateDnis();
