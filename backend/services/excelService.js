const XLSX = require("xlsx");
const {
  normalizeText,
  normalizeDni,
  normalizeDate,
  normalizePhone,
} = require("../utils/normalize");
const { isValidDni, isValidName } = require("../utils/validators");
const {
  loadEstablishmentsCache,
  getEstablishmentId,
  updateEstablishmentMeta,
} = require("./establishmentService");
const { getDynamicMapping, getField } = require("../utils/excelHelpers");
const { insertPatientsBatch } = require("./patientService");
const { insertAttentionsBatch } = require("./attentionService");
const { insertMammographyBatch } = require("./mammographyService");

const VALID_SHEETS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OCT",
  "NOV",
  "DIC",
];
const META_SHEET = "METAS Y AVANCES 2026";

/**
 * Procesa el Excel y devuelve un resumen de validación sin guardar en la DB.
 */
const previewMammographyExcel = async (filePath) => {
  await loadEstablishmentsCache();
  const workbook = XLSX.readFile(filePath || "./uploads/MAMOGRAFIA 2026.xlsx");

  const currentMonthIdx = new Date().getMonth();
  const seenSheets = new Set();
  const sheetsToProcess = workbook.SheetNames.filter((sheet) => {
    const upper = sheet.toUpperCase();
    const monthIdx = VALID_SHEETS.indexOf(upper);
    if (monthIdx !== -1 && monthIdx <= currentMonthIdx && !seenSheets.has(upper)) {
      seenSheets.add(upper);
      return true;
    }
    return false;
  });

  const preview = {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    errors: [], // { sheet, row, dni, message }
    data: [], // Primeras 10 filas válidas para muestra
  };

  for (const sheetName of sheetsToProcess) {
    const sheet = workbook.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    rows = rows.filter((row) =>
      Object.values(row).some((v) => v !== null && v !== ""),
    );
    if (rows.length === 0) continue;

    const mapping = await getDynamicMapping(rows[0], sheetName);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      const dniRaw = getField(row, mapping, "dni");
      const nombreRaw = getField(row, mapping, "nombres");
      const estRaw = getField(row, mapping, "establecimiento");

      // SILENT SKIP: Si no hay DNI ni nombre, ignorar la fila sin reportar error (es basura del excel)
      if (!dniRaw && (!nombreRaw || String(nombreRaw).trim() === "")) continue;

      preview.totalRows++;

      if (!dniRaw) {
        preview.invalidRows++;
        preview.errors.push({
          sheet: sheetName,
          row: rowIndex,
          message: "DNI vacío",
        });
        continue;
      }

      const dni = normalizeDni(dniRaw);
      const nombres = normalizeText(nombreRaw);
      const estId = getEstablishmentId(estRaw);

      if (!isValidDni(dni)) {
        preview.invalidRows++;
        preview.errors.push({
          sheet: sheetName,
          row: rowIndex,
          dni: dniRaw,
          message: "DNI inválido (debe tener 8 dígitos)",
        });
        continue;
      }

      if (!isValidName(nombres)) {
        preview.invalidRows++;
        preview.errors.push({
          sheet: sheetName,
          row: rowIndex,
          dni,
          message: "Nombre inválido o muy corto",
        });
        continue;
      }

      if (!estId) {
        preview.invalidRows++;
        preview.errors.push({
          sheet: sheetName,
          row: rowIndex,
          dni,
          message: `Establecimiento no reconocido: "${estRaw || ""}"`,
        });
        continue;
      }

      preview.validRows++;
      if (preview.data.length < 10) {
        preview.data.push({
          dni,
          nombres,
          establecimiento: estRaw,
          hoja: sheetName,
        });
      }
    }
  }

  return preview;
};

/**
 * Procesa e importa realmente los datos (Versión mejorada con Mapeos Dinámicos)
 */
const processMammographyExcel = async (filePath) => {
  const finalFilePath = filePath || "./uploads/MAMOGRAFIA 2026.xlsx";
  await loadEstablishmentsCache();
  const workbook = XLSX.readFile(finalFilePath);

  // 🎯 IMPORTAR METAS
  if (workbook.SheetNames.includes(META_SHEET)) {
    const metaRows = XLSX.utils.sheet_to_json(workbook.Sheets[META_SHEET]);
    for (const row of metaRows) {
      if (row["ESTABLECIMIENTO DE SALUD"] && row["META ANUAL"]) {
        await updateEstablishmentMeta(
          row["ESTABLECIMIENTO DE SALUD"],
          parseInt(row["META ANUAL"]),
        );
      }
    }
  }

  const currentMonthIdx = new Date().getMonth();
  const seenSheets = new Set();
  const sheetsToProcess = workbook.SheetNames.filter((sheet) => {
    const upper = sheet.toUpperCase();
    const monthIdx = VALID_SHEETS.indexOf(upper);
    if (monthIdx !== -1 && monthIdx <= currentMonthIdx && !seenSheets.has(upper)) {
      seenSheets.add(upper);
      return true;
    }
    return false;
  });
  let totalImported = 0;

  for (const sheetName of sheetsToProcess) {
    const rows = XLSX.utils
      .sheet_to_json(workbook.Sheets[sheetName], { defval: null })
      .filter((row) => Object.values(row).some((v) => v !== null && v !== ""));

    if (rows.length === 0) continue;
    const mapping = await getDynamicMapping(rows[0], sheetName);
    const recordsBatch = [];

    for (const row of rows) {
      const dniRaw = getField(row, mapping, "dni");
      const nombreRaw = getField(row, mapping, "nombres");
      
      // Ignorar filas vacías silenciosamente
      if (!dniRaw && (!nombreRaw || String(nombreRaw).trim() === "")) continue;

      const dni = normalizeDni(dniRaw);
      const nombres = normalizeText(nombreRaw);
      const estId = getEstablishmentId(
        getField(row, mapping, "establecimiento"),
      );

      if (isValidDni(dni) && isValidName(nombres) && estId) {
        const fechaRecord =
          normalizeDate(getField(row, mapping, "fecha_toma_mx")) ||
          (row["FECHA "] ? normalizeDate(row["FECHA "]) : null) ||
          new Date();

        recordsBatch.push({
          paciente: {
            dni,
            nombres,
            edad: Number(getField(row, mapping, "edad")) || null,
            historia_clinica: getField(row, mapping, "hcl"),
            telefono: normalizePhone(getField(row, mapping, "telefono")),
            direccion: normalizeText(getField(row, mapping, "direccion")),
            distrito: normalizeText(getField(row, mapping, "distrito")),
          },
          atencion: {
            establecimiento_id: estId,
            campaña_id: 1,
            fecha: fechaRecord,
            estado: "REGISTRADO",
          },
          mamografia: {
            birads_mx: (
              normalizeText(getField(row, mapping, "birads_mx")) || ""
            ).substring(0, 20),
            resultados_mx: normalizeText(getField(row, mapping, "resultados")),
            sugerencia_mx: normalizeText(getField(row, mapping, "sugerencia")),
            fecha_toma_mx: fechaRecord,
            fecha_recepcion_resultados: normalizeDate(
              getField(row, mapping, "fecha_recepcion"),
            ),
            fecha_recojo_resultados: normalizeDate(
              getField(row, mapping, "fecha_recojo"),
            ),
            fecha_entrega: normalizeDate(
              getField(row, mapping, "fecha_entrega"),
            ),
            cita_ecografia: normalizeText(
              getField(row, mapping, "cita_ecografia"),
            ),
            resultados_ecografia: normalizeText(
              getField(row, mapping, "resultados_ecografia"),
            ),
            birads_ecografia: normalizeText(
              getField(row, mapping, "birads_ecografia"),
            ),
            sugerencias_ecografia: normalizeText(
              getField(row, mapping, "sugerencias_ecografia"),
            ),
            fecha_toma_magnificacion: normalizeDate(
              getField(row, mapping, "fecha_toma_magnificacion"),
            ),
            resultados_magnificacion: normalizeText(
              getField(row, mapping, "resultados_magnificacion"),
            ),
            birads_magnificacion: normalizeText(
              getField(row, mapping, "birads_magnificacion"),
            ),
            sugerencias_magnificacion: normalizeText(
              getField(row, mapping, "sugerencias_magnificacion"),
            ),
            fecha_referencia_hrh: normalizeDate(
              getField(row, mapping, "fecha_referencia_hrh"),
            ),
            procedimiento_fecha: normalizeDate(
              getField(row, mapping, "procedimiento_fecha"),
            ),
            tratamiento_otra_institucion: normalizeText(
              getField(row, mapping, "tratamiento_otra"),
            ),
            referencia_otra_institucion: normalizeText(
              getField(row, mapping, "referencia_otra"),
            ),
            situacion_actual: normalizeText(
              getField(row, mapping, "situacion_actual"),
            ),
          },
        });

        if (recordsBatch.length >= 100) {
          const res = await processBatch(recordsBatch);
          totalImported += res.importedAttentions;
          recordsBatch.length = 0;
        }
      }
    }

    if (recordsBatch.length > 0) {
      const res = await processBatch(recordsBatch);
      totalImported += res.importedAttentions;
    }
  }

  return { success: true, totalImported };
};

const processBatch = async (batch) => {
  // Deduplicar el batch por DNI y Fecha para evitar duplicados en el mismo proceso
  const uniqueBatchMap = new Map();
  for (const item of batch) {
    const dateStr =
      item.atencion.fecha instanceof Date
        ? item.atencion.fecha.toISOString().split("T")[0]
        : item.atencion.fecha;
    const key = `${item.paciente.dni}_${dateStr}`;
    if (!uniqueBatchMap.has(key)) {
      uniqueBatchMap.set(key, item);
    }
  }
  const uniqueBatch = Array.from(uniqueBatchMap.values());

  const insertedPatients = await insertPatientsBatch(
    uniqueBatch.map((r) => r.paciente),
  );
  const patientIdByDni = new Map(insertedPatients.map((p) => [p.dni, p.id]));

  const attentionsData = uniqueBatch.map((r) => ({
    ...r.atencion,
    paciente_id: patientIdByDni.get(r.paciente.dni),
  }));
  const insertedAttentions = await insertAttentionsBatch(attentionsData);

  // Mapear IDs de atención de forma segura usando paciente_id y fecha
  const attentionIdMap = new Map();
  for (const att of insertedAttentions) {
    const dateStr = new Date(att.fecha).toISOString().split("T")[0];
    const key = `${att.paciente_id}_${dateStr}`;
    attentionIdMap.set(key, att.id);
  }

  const mammographyData = uniqueBatch.map((r) => {
    const pId = patientIdByDni.get(r.paciente.dni);
    const dateStr =
      r.atencion.fecha instanceof Date
        ? r.atencion.fecha.toISOString().split("T")[0]
        : r.atencion.fecha;
    const key = `${pId}_${dateStr}`;
    return {
      ...r.mamografia,
      atencion_id: attentionIdMap.get(key),
    };
  });
  await insertMammographyBatch(mammographyData);

  return { importedAttentions: insertedAttentions.length };
};

module.exports = {
  processMammographyExcel,
  previewMammographyExcel,
};
