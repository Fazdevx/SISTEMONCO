const path = require("path");
const fs = require("fs");

// Intentar cargar .env desde varias ubicaciones
const envPaths = [
  path.join(__dirname, "../.env"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "backend/.env"),
];

let envFound = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log(`ℹ️ Configuración cargada desde: ${envPath}`);
    envFound = true;
    break;
  }
}

if (!envFound) {
  console.warn(
    "⚠️ No se encontró archivo .env. Se usarán variables de entorno del sistema si existen.",
  );
}

const supabase = require("../config/supabase");

async function cleanFutureData() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    console.error(
      "❌ Error: SUPABASE_URL o SUPABASE_KEY no están definidas en el entorno.",
    );
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  console.log(`🔍 Buscando registros con fecha >= ${today} para limpiar...`);

  // 1. Obtener IDs de atenciones futuras
  const { data: atenciones, error: errA } = await supabase
    .from("atenciones")
    .select("id")
    .gte("fecha", today);

  if (errA) {
    console.error("Error al buscar atenciones:", errA);
    return;
  }

  if (!atenciones || atenciones.length === 0) {
    console.log("No hay registros futuros que limpiar.");
    return;
  }

  const ids = atenciones.map((a) => a.id);
  console.log(
    `Eliminando ${ids.length} registros (Mamografías y Atenciones)...`,
  );

  // 2. Eliminar detalles de mamografía (hijo)
  const { error: errM } = await supabase
    .from("detalle_mamografia")
    .delete()
    .in("atencion_id", ids);

  if (errM) {
    console.error("Error al eliminar detalles:", errM);
    return;
  }

  // 3. Eliminar atenciones (padre)
  const { error: errFinal } = await supabase
    .from("atenciones")
    .delete()
    .in("id", ids);

  if (errFinal) {
    console.error("Error al eliminar atenciones:", errFinal);
  } else {
    console.log("✅ Base de datos limpiada con éxito.");
  }
}

cleanFutureData();
