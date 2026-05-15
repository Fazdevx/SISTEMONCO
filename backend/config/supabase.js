const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE
) {

  throw new Error(
    'Faltan variables de entorno Supabase'
  );

}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  {
    realtime: {
      transport: ws,
    },
  }
);

module.exports = supabase;