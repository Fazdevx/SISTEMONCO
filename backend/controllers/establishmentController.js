// establishmentController.js
const supabase = require("../config/supabase");
const establishmentService = require("../services/establishmentService");

const getMicroredes = async (req, res) => {
  const { data, error } = await supabase
    .from("microredes")
    .select("*")
    .order("nombre");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getEstablecimientos = async (req, res) => {
  let query = supabase
    .from("establecimientos")
    .select("*, microred:microredes(nombre)")
    .order("nombre");

  // Si no es admin, filtrar por el establecimiento del usuario
  if (req.user.rol !== "admin") {
    if (req.user.rol === "establecimiento") {
      query = query.eq("id", req.user.establecimiento_id);
    } else if (req.user.rol === "microred") {
      query = query.eq("microred_id", req.user.microred_id);
    }
  }

  if (req.query.microred_id) {
    query = query.eq("microred_id", req.query.microred_id);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateEstablishmentMeta = async (req, res) => {
  const { id } = req.params; // Obtiene el ID de los parámetros de la ruta
  const { meta_anual } = req.body; // Obtiene la meta del cuerpo de la solicitud

  if (!id || meta_anual === undefined || meta_anual === null) {
    return res
      .status(400)
      .json({ error: "Faltan ID del establecimiento o meta_anual." });
  }

  // Validar que meta_anual sea un número
  const metaNumber = parseInt(meta_anual, 10);
  if (isNaN(metaNumber)) {
    return res
      .status(400)
      .json({ error: "meta_anual debe ser un número válido." });
  }

  try {
    const success = await establishmentService.updateEstablishmentMetaById(
      id,
      metaNumber,
    );

    if (success === null) {
      return res.status(404).json({ error: "Establecimiento no encontrado." });
    }
    if (success === false) {
      return res
        .status(500)
        .json({ error: "Error al actualizar la meta en la base de datos." });
    }

    res.json({ message: "Meta actualizada exitosamente." });
  } catch (error) {
    console.error("Error en updateEstablishmentMeta controller:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

module.exports = {
  getMicroredes,
  getEstablecimientos,
  updateEstablishmentMeta,
};
