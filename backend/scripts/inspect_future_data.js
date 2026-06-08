require('dotenv').config({ path: '../.env' });
const supabase = require('../config/supabase');

async function inspectFutureData() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Buscando registros con fecha > ${today}...`);

  const { data, error } = await supabase
    .from('atenciones')
    .select('id, fecha, paciente:pacientes(dni, nombres)')
    .gt('fecha', today)
    .order('fecha');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Se encontraron ${data.length} registros futuros.`);
  data.forEach(a => {
    console.log(`ID: ${a.id} | Fecha: ${a.fecha} | Paciente: ${a.paciente?.dni} - ${a.paciente?.nombres}`);
  });

  // También revisar Mayo si estamos a principios de Junio para ver si hay solapamiento
  const firstOfJune = '2026-06-01';
  const { data: juneData } = await supabase
    .from('atenciones')
    .select('id, fecha')
    .gte('fecha', firstOfJune)
    .lte('fecha', today);
  
  console.log(`Registros detectados en Junio hasta hoy: ${juneData?.length || 0}`);
}

inspectFutureData();
