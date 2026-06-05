require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkData() {
  const { data: paciente, error: pError } = await supabase.from('pacientes').select('*').limit(1);
  console.log('--- Paciente ---');
  console.log(paciente);
  if (pError) console.error(pError);

  const { data: mammo, error: mError } = await supabase.from('detalle_mamografia').select('*, atencion:atenciones(*, paciente:pacientes(dni))').limit(1);
  console.log('--- Mamografía ---');
  console.log(JSON.stringify(mammo, null, 2));
  if (mError) console.error(mError);
}

checkData();
