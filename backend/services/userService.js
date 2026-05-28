const supabase = require('../config/supabase');

// Listar usuarios con sus perfiles y establecimientos
const getUsers = async () => {
  // 1. Obtener perfiles
  const { data: profiles, error: profileError } = await supabase
    .from('perfiles')
    .select(`
      id,
      nombres,
      rol,
      establecimiento_id,
      microred_id,
      notificaciones_email,
      created_at,
      establecimiento:establecimientos(nombre),
      microred:microredes(nombre)
    `);
  if (profileError) throw profileError;

  // 2. Obtener usuarios de Auth para el email
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;

  // 3. Combinar datos
  const combinedUsers = profiles.map(profile => {
    const authUser = authUsers.find(u => u.id === profile.id);
    return {
      ...profile,
      email: authUser?.email || 'S/N'
    };
  });

  return combinedUsers;
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
  const { email, nombres, rol, establecimiento_id, microred_id, password, notificaciones_email } = updateData;

  // 1. Actualizar datos en Auth (email y/o password)
  const authUpdates = {};
  if (email) authUpdates.email = email;
  if (password) authUpdates.password = password;

  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdates);
    if (authError) throw authError;
  }

  // 2. Actualizar datos del perfil
  const profileUpdates = {};
  if (nombres !== undefined) profileUpdates.nombres = nombres;
  if (rol !== undefined) profileUpdates.rol = rol;
  if (establecimiento_id !== undefined) profileUpdates.establecimiento_id = establecimiento_id || null;
  if (microred_id !== undefined) profileUpdates.microred_id = microred_id || null;
  if (notificaciones_email !== undefined) profileUpdates.notificaciones_email = notificaciones_email;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase
      .from('perfiles')
      .update(profileUpdates)
      .eq('id', userId);
    if (error) throw error;
  }

  return { success: true };
};

// Eliminar usuario (borra auth y perfil)
const deleteUser = async (userId) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
  return { success: true };
};

// Obtener un usuario por ID
const getUser = async (userId) => {
  // 1. Obtener perfil
  const { data: profile, error: profileError } = await supabase
    .from('perfiles')
    .select(`
      id,
      nombres,
      rol,
      establecimiento_id,
      microred_id,
      notificaciones_email,
      created_at,
      establecimiento:establecimientos(nombre),
      microred:microredes(nombre)
    `)
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;

  // 2. Obtener email de Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError) throw authError;

  const response = {
    ...profile,
    email: authUser?.email || 'S/N'
  };

  console.log('--- GET USER BY ID ---');
  console.log('ID:', userId);
  console.log('Datos encontrados:', response);

  return response;
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };