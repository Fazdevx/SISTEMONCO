require('dotenv').config();
const userService = require('./services/userService');

async function testGetUser() {
  const { data: users } = await require('./config/supabase').from('perfiles').select('id').limit(1);
  if (users && users[0]) {
    const id = users[0].id;
    console.log('Probando getUser para ID:', id);
    const user = await userService.getUser(id);
    console.log('Resultado:', user);
  } else {
    console.log('No hay usuarios para probar.');
  }
}

testGetUser();
