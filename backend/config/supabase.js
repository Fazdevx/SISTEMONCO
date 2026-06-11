const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
  console.error("ERROR CRÍTICO: Variables de entorno faltantes en el Backend");
  console.error("SUPABASE_URL:", process.env.SUPABASE_URL ? "OK" : "FALTA");
  console.error(
    "SUPABASE_SERVICE_ROLE:",
    process.env.SUPABASE_SERVICE_ROLE ? "OK" : "FALTA",
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  {
    auth: {
      persistSession: false,
    },
  },
);

module.exports = supabase;
