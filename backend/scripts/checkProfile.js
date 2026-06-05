require('dotenv').config();
const supabase = require('../config/supabase');

async function checkProfile() {
  const userId = '0381de00-31e1-496a-a368-f17202946a41';
  
  console.log('Verificando perfil para ID:', userId);
  
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId);

  if (error) {
    console.error('Error al consultar:', error);
  } else {
    console.log('Resultado de la consulta:', data);
    if (data.length === 0) {
      console.log('¡ADVERTENCIA: El perfil no existe en la tabla "perfiles"!');
    } else {
      console.log('El perfil existe correctamente.');
    }
  }
}

checkProfile();
