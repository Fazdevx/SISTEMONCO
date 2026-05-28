const supabase = require("../config/supabase");

const establishmentCache = new Map();

// MAPEO DE NOMBRES (Excel → Base de datos)
const ESTABLISHMENT_MAPPING = {
  // Hospitales
  "HOSPITAL REGIONAL DE HUACHO": "Hospital Regional Huacho",
  "HOSPITAL DE CHANCAY": "Hospital de Chancay",
  "HOSPITAL DE HUARAL": "Hospital de Huaral",
  "CENTRO BASE HUARAL": "Centro Base Huaral",

  // Centros de Salud
  "C.S. EL SOCORRO": "C.S. EL SOCORRO",
  "C. S. EL SOCORRO": "C.S. EL SOCORRO",
  "C. S. VEGUETA": "C.S. VEGUETA",
  "C. S. SAYAN": "C.S. SAYAN",

  // Puestos de Salud
  "P. S. SAN JUDAS TADEO": "P.S. SAN JUDAS TADEO",
  "P.S. IC. MARIATEGUI": "P.S. MARIATEGUI",
};

const normalizeEstablishmentName = (nombreFromExcel) => {
  if (!nombreFromExcel) return null;

  // Limpiar y normalizar
  let cleaned = nombreFromExcel.toString().trim().toUpperCase();

  // Buscar en el mapeo
  for (let [excelName, dbName] of Object.entries(ESTABLISHMENT_MAPPING)) {
    if (excelName === cleaned) {
      return dbName;
    }
  }

  // Si no hay mapeo, devolver el nombre original
  return nombreFromExcel.toString().trim();
};

// CARGAR TODOS LOS ESTABLECIMIENTOS
const loadEstablishmentsCache = async () => {
  try {
    const { data, error } = await supabase
      .from("establecimientos")
      .select("id, nombre");

    if (error) throw error;

    establishmentCache.clear();

    for (const establishment of data) {
      const normalizedName = establishment.nombre.toUpperCase().trim();
      establishmentCache.set(normalizedName, establishment.id);
    }

    console.log(`✅ Establecimientos cargados: ${data.length}`);
    return data.length;
  } catch (error) {
    console.error("❌ Error cargando establecimientos:", error);
    throw error;
  }
};

const getEstablishmentId = (nombreFromExcel) => {
  if (!nombreFromExcel) return null;

  // 🔧 CORREGIDO: usar establishmentCache (sin 's')
  if (!establishmentCache || establishmentCache.size === 0) {
    console.error("❌ establishmentCache no ha sido cargado todavía");
    return null;
  }

  // Normalizar el nombre usando el mapeo
  const normalizedName = normalizeEstablishmentName(nombreFromExcel);

  // Buscar en cache (case insensitive)
  for (let [dbName, id] of establishmentCache.entries()) {
    if (dbName.toLowerCase() === normalizedName.toLowerCase()) {
      return id;
    }
  }

  // Log para debugging
  console.log(
    `⚠️ Establecimiento no encontrado: "${nombreFromExcel}" → normalizado: "${normalizedName}"`,
  );
  return null;
};

const getAllEstablishmentNames = () => {
  return Array.from(establishmentCache.keys());
};

const updateEstablishmentMeta = async (nombreFromExcel, metaAnual) => {
  const normalizedName = normalizeEstablishmentName(nombreFromExcel);

  // Buscar el ID en cache
  let establishmentId = null;
  for (let [dbName, id] of establishmentCache.entries()) {
    if (dbName.toLowerCase() === normalizedName.toLowerCase()) {
      establishmentId = id;
      break;
    }
  }

  if (!establishmentId) return null;

  const { error } = await supabase
    .from("establecimientos")
    .update({ meta_anual: metaAnual })
    .eq("id", establishmentId);

  if (error) {
    console.error(
      `❌ Error actualizando meta para ${nombreFromExcel}:`,
      error.message,
    );
    return false;
  }

  return true;
};

const updateEstablishmentMetaById = async (id, metaAnual) => {
  const { error } = await supabase
    .from("establecimientos")
    .update({ meta_anual: metaAnual })
    .eq("id", id);

  if (error) {
    console.error(`❌ Error actualizando meta para ID ${id}:`, error.message);
    return false;
  }

  return true;
};

module.exports = {
  loadEstablishmentsCache,
  getEstablishmentId,
  getAllEstablishmentNames,
  establishmentCache,
  normalizeEstablishmentName,
  ESTABLISHMENT_MAPPING,
  updateEstablishmentMeta,
  updateEstablishmentMetaById,
};
