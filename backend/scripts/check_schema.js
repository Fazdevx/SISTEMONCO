require('dotenv').config({ path: '../.env' });
const supabase = require('../config/supabase');

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_constraints', { table_name: 'atenciones' });
  if (error) {
    // If RPC doesn't exist, try something else
    console.log('RPC get_constraints failed, trying manual query');
    const { data: data2, error: error2 } = await supabase.from('atenciones').select('*').limit(1);
    console.log('Sample attention:', data2);
  } else {
    console.log('Constraints:', data);
  }
}
checkConstraints();
