require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function testHistory() {
  const dni = '15603032';
  console.log('Buscando paciente con DNI:', dni);
  const { data: pacientes, error: pError } = await supabase
    .from('pacientes')
    .select('*')
    .eq('dni', dni);
  
  console.log('Pacientes encontrados:', pacientes);
  if (pError) console.error(pError);

  if (pacientes && pacientes.length > 0) {
    const paciente = pacientes[0];
    console.log('Buscando historial para paciente_id:', paciente.id);
    const { data: historial, error: hError } = await supabase
      .from('detalle_mamografia')
      .select('*, atencion:atenciones!inner(*)')
      .eq('atencion.paciente_id', paciente.id);
    
    console.log('Historial encontrado:', historial?.length);
    if (hError) console.error(hError);
  }
}

testHistory();
