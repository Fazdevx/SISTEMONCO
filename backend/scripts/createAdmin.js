// scripts/createAdmin.js
require('dotenv').config();
const supabase = require('../config/supabase'); // tu cliente de Supabase con la clave de servicio (service_role)


async function createAdmin() {
  const email = 'admin@ejemplo.com';
  const password = 'Admin123!';
  const nombres = 'Administrador';

  // 1. Crear usuario en auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creando usuario:', authError);
    return;
  }

  console.log('Usuario creado:', authUser.user.id);

  // 2. Crear perfil asociado
  const { error: profileError } = await supabase
    .from('perfiles')
    .insert({
      id: authUser.user.id,
      nombres: nombres,
      rol: 'admin',
      establecimiento_id: null,
      microred_id: null,
    });

  if (profileError) {
    console.error('Error creando perfil:', profileError);
  } else {
    console.log('Perfil admin creado exitosamente');
  }
}

createAdmin();