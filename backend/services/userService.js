const supabase = require('../config/supabase');

// Listar usuarios con sus perfiles y establecimientos
const getUsers = async () => {
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      id,
      nombres,
      rol,
      establecimiento_id,
      microred_id,
      created_at,
      establecimiento:establecimientos(nombre),
      microred:microredes(nombre)
    `);
  if (error) throw error;
  return data;
};

// Crear un nuevo usuario (auth + perfil)
const createUser = async (email, password, nombres, rol, establecimiento_id, microred_id) => {
  // Crear usuario en auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (authError) throw authError;

  // Crear perfil
  const { error: profileError } = await supabase
    .from('perfiles')
    .insert({
      id: authUser.user.id,
      nombres,
      rol,
      establecimiento_id,
      microred_id
    });
  if (profileError) throw profileError;

  return { id: authUser.user.id, email };
};

// Actualizar perfil de usuario
const updateUser = async (userId, updateData) => {
  const { error } = await supabase
    .from('perfiles')
    .update(updateData)
    .eq('id', userId);
  if (error) throw error;
  return { success: true };
};

// Eliminar usuario (borra auth y perfil)
const deleteUser = async (userId) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
  return { success: true };
};

module.exports = { getUsers, createUser, updateUser, deleteUser };