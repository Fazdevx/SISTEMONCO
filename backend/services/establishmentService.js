const supabase = require("../config/supabase");

const establishmentCache = new Map();
const dbMapping = new Map();

// CARGAR TODOS LOS ESTABLECIMIENTOS Y SUS MAPEOS
const loadEstablishmentsCache = async () => {
  try {
    // 1. Cargar establecimientos base
    const { data: ests, error: estErr } = await supabase
      .from("establecimientos")
      .select("id, nombre");

    if (estErr) throw estErr;

    establishmentCache.clear();
    for (const est of ests) {
      establishmentCache.set(est.nombre.toUpperCase().trim(), est.id);
    }

    // 2. Cargar mapeos dinámicos desde la DB
    const { data: mappings, error: mapErr } = await supabase
      .from("establecimiento_mapeos")
      .select("nombre_excel, establecimiento_id");

    if (!mapErr && mappings) {
      dbMapping.clear();
      for (const m of mappings) {
        dbMapping.set(m.nombre_excel.toUpperCase().trim(), m.establecimiento_id);
      }
    }

    console.log(`✅ Establecimientos cargados: ${ests.length}. Mapeos: ${mappings?.length || 0}`);
    return ests.length;
  } catch (error) {
    console.error("❌ Error cargando establecimientos:", error);
    throw error;
  }
};

const getEstablishmentId = (nombreFromExcel) => {
  if (!nombreFromExcel) return null;

  const cleaned = nombreFromExcel.toString().trim().toUpperCase();

  // 1. Buscar en mapeos dinámicos (DB) - Prevalecen sobre el nombre exacto
  if (dbMapping.has(cleaned)) return dbMapping.get(cleaned);

  // 2. Buscar en nombres base (nombre exacto)
  if (establishmentCache.has(cleaned)) return establishmentCache.get(cleaned);

  return null;
};

const getAllEstablishmentNames = () => {
  return Array.from(establishmentCache.keys());
};

const updateEstablishmentMeta = async (nombreFromExcel, metaAnual) => {
  const establishmentId = getEstablishmentId(nombreFromExcel);

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
  updateEstablishmentMeta,
  updateEstablishmentMetaById,
};
