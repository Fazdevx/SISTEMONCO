const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error("ERROR: Faltan variables de entorno de Supabase en el Backend.");
  console.error("Verifique SUPABASE_URL y SUPABASE_SERVICE_ROLE en el panel de Vercel.");
}

const supabase = createClient(
  supabaseUrl || "",
  supabaseServiceRole || "",
  {
    auth: {
      persistSession: false,
    },
  }
);

module.exports = supabase;
