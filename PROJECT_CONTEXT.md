# PROJECT CONTEXT


# File: backend\add_meta_column.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function addMetaColumn() {
  console.log('Intentando agregar columna meta_anual a establecimientos...');
  // Supabase JS client doesn't support ALTER TABLE directly. 
  // Usually we need to use the SQL Editor in Supabase UI or a migration.
  // However, I'll try to see if there's a way to run SQL or if I should just use what I have.
  
  // If I can't add the column, I might have to store metas in a JSON file or hardcoded for now,
  // but adding the column is the right way.
  
  // Let's try to use a common RPC if it exists (unlikely in default setups)
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE establecimientos ADD COLUMN IF NOT EXISTS meta_anual INTEGER DEFAULT 0;' });
  
  if (error) {
    console.error('No se pudo agregar la columna vía RPC:', error.message);
    console.log('Sugerencia: Agregar la columna meta_anual (INTEGER) manualmente en la tabla establecimientos.');
  } else {
    console.log('Columna agregada exitosamente (o ya existía).');
  }
}

addMetaColumn();

```
---

# File: backend\checkProfile.js
```js
require('dotenv').config();
const supabase = require('./config/supabase');

async function checkProfile() {
  const userId = '0381de00-31e1-496a-a368-f17202946a41';
  
  console.log('Verificando perfil para ID:', userId);
  
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId);

  if (error) {
    console.error('Error al consultar:', error);
  } else {
    console.log('Resultado de la consulta:', data);
    if (data.length === 0) {
      console.log('¡ADVERTENCIA: El perfil no existe en la tabla "perfiles"!');
    } else {
      console.log('El perfil existe correctamente.');
    }
  }
}

checkProfile();

```
---

# File: backend\check_establecimientos.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkEstablecimientos() {
  const { data, error } = await supabase.from('establecimientos').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columnas de establecimientos:', Object.keys(data[0]));
    console.log('Ejemplo de registro:', data[0]);
  } else {
    console.log('No se encontraron establecimientos.');
  }
}

checkEstablecimientos();

```
---

# File: backend\import_metas_only.js
```js
require('dotenv').config();
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configuración directa para el script
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Mapeo de nombres (Copiado de establishmentService para consistencia)
const ESTABLISHMENT_MAPPING = {
  'HOSPITAL REGIONAL DE HUACHO': 'Hospital Regional Huacho',
  'HOSPITAL DE CHANCAY': 'Hospital de Chancay',
  'HOSPITAL DE HUARAL': 'Hospital de Huaral',
  'CENTRO BASE HUARAL': 'Centro Base Huaral',
  'C.S. EL SOCORRO': 'C.S. EL SOCORRO',
  'C. S. EL SOCORRO': 'C.S. EL SOCORRO',
  'C. S. VEGUETA': 'C.S. VEGUETA',
  'C. S. SAYAN': 'C.S. SAYAN',
  'P. S. SAN JUDAS TADEO': 'P.S. SAN JUDAS TADEO',
  'P.S. IC. MARIATEGUI': 'P.S. MARIATEGUI'
};

function normalizeName(name) {
  if (!name) return null;
  // Limpiar espacios y puntos para comparación robusta
  let cleaned = name.toString().trim().toUpperCase();
  
  // Normalización agresiva: remover puntos para comparar
  const simplify = (s) => s.replace(/\./g, '').replace(/\s+/g, ' ').trim();
  
  const simplifiedExcel = simplify(cleaned);
  
  // Intentar mapeo directo primero
  if (ESTABLISHMENT_MAPPING[cleaned]) return ESTABLISHMENT_MAPPING[cleaned];

  return cleaned;
}

async function importMetas() {
  const FILE_PATH = './uploads/MAMOGRAFIA 2026.xlsx';
  const SHEET_NAME = 'METAS Y AVANCES 2026';

  console.log('🚀 Iniciando importación de METAS...');

  try {
    // 1. Cargar cache de establecimientos
    const { data: dbEsts, error: errEst } = await supabase.from('establecimientos').select('id, nombre');
    if (errEst) throw errEst;

    const estCache = new Map();
    // Guardamos versión simplificada para comparar
    const simplify = (s) => s.replace(/\./g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    dbEsts.forEach(e => estCache.set(simplify(e.nombre), e.id));
    console.log(`📦 Cache cargado: ${dbEsts.length} establecimientos.`);

    // 2. Leer Excel
    const workbook = XLSX.readFile(FILE_PATH);
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
      throw new Error(`No se encontró la hoja "${SHEET_NAME}"`);
    }

    const sheet = workbook.Sheets[SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`📄 Filas encontradas en Excel: ${rows.length}`);

    let actualizados = 0;
    let noEncontrados = 0;

    // 3. Procesar metas
    for (const row of rows) {
      const nombreExcel = row['ESTABLECIMIENTO DE SALUD'];
      const metaAnual = row['META ANUAL'];

      if (!nombreExcel || !metaAnual) continue;

      const simplifiedExcel = simplify(nombreExcel);
      let estId = estCache.get(simplifiedExcel);

      // Casos especiales manuales si falla el simplificado
      if (!estId) {
        if (simplifiedExcel === 'HOSPITAL GENERAL DE HUACHO') estId = estCache.get(simplify('HOSPITAL REGIONAL HUACHO'));
        if (simplifiedExcel === 'C S SAYAN') estId = estCache.get(simplify('C.S. SAYAN'));
        if (simplifiedExcel === 'P SCARQUIN') estId = estCache.get(simplify('P.S. CARQUIN'));
      }

      if (estId) {
        const { error: updErr } = await supabase
          .from('establecimientos')
          .update({ meta_anual: parseInt(metaAnual) })
          .eq('id', estId);

        if (updErr) {
          console.error(`❌ Error actualizando ${nombreExcel}:`, updErr.message);
        } else {
          actualizados++;
        }
      } else {
        noEncontrados++;
        if (!nombreExcel.includes('RED DE SALUD') && !nombreExcel.includes('MICRO RED')) {
          console.log(`⚠️ No encontrado en DB: "${nombreExcel}"`);
        }
      }
    }

    console.log('\n✨ PROCESO TERMINADO');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Metas actualizadas: ${actualizados}`);
    console.log(`⚠️ No encontrados:     ${noEncontrados}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  } catch (error) {
    console.error('💥 Error crítico:', error.message);
  }
}

importMetas();

```
---

# File: backend\inspect_excel.js
```js
const XLSX = require('xlsx');

function inspectExcel() {
  const FILE_NAME = 'MAMOGRAFIA 2026.xlsx';
  try {
    const workbook = XLSX.readFile(`./backend/uploads/${FILE_NAME}`);
    console.log('Hojas en el Excel:', workbook.SheetNames);
    
    // Buscar alguna hoja que pueda tener metas
    const metaSheet = workbook.SheetNames.find(s => s.toLowerCase().includes('meta') || s.toLowerCase().includes('objetivo'));
    if (metaSheet) {
      console.log(`¡Hoja de metas encontrada!: ${metaSheet}`);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[metaSheet]);
      console.log('Muestra de datos de metas:', data.slice(0, 5));
    } else {
      console.log('No se encontró una hoja explícita de metas.');
      // Revisar si en alguna hoja de mes hay una columna de meta (poco común pero posible)
      const sampleSheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sampleSheet], { header: 1 });
      console.log(`Cabeceras de la hoja ${sampleSheet}:`, data[0]);
    }
  } catch (error) {
    console.error('Error leyendo Excel:', error.message);
  }
}

inspectExcel();

```
---

# File: backend\list_ests.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function listAll() {
  const { data, error } = await supabase.from('establecimientos').select('nombre');
  if (data) {
    console.log('Nombres en DB (primeros 20):');
    console.log(data.slice(0, 20).map(e => e.nombre));
    console.log('Total en DB:', data.length);
  }
}

listAll();

```
---

# File: backend\scratch_check_cols.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkColumns() {
  const { data, error } = await supabase.from('detalle_mamografia').select('*').limit(1);
  if (data && data[0]) {
    console.log('Columnas encontradas:', Object.keys(data[0]));
    console.log('Valores ejemplo:', data[0]);
  } else {
    console.log('No se pudo obtener registro. Error:', error);
  }
}

checkColumns();

```
---

# File: backend\scratch_check_db.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function checkData() {
  const { data: paciente, error: pError } = await supabase.from('pacientes').select('*').limit(1);
  console.log('--- Paciente ---');
  console.log(paciente);
  if (pError) console.error(pError);

  const { data: mammo, error: mError } = await supabase.from('detalle_mamografia').select('*, atencion:atenciones(*, paciente:pacientes(dni))').limit(1);
  console.log('--- Mamografía ---');
  console.log(JSON.stringify(mammo, null, 2));
  if (mError) console.error(mError);
}

checkData();

```
---

# File: backend\server.js
```js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// 1. Configuración de Middleware
app.use(cors({
  origin: '*', // Permitir cualquier origen en desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (Object.keys(req.query).length) console.log('Query:', req.query);
  next();
});

// 2. Importación de Rutas
const mammographyRoutes = require('./routes/mammographyRoutes');
const userRoutes = require('./routes/userRoutes');
const establishmentRoutes = require('./routes/establishmentRoutes');
const importRoutes = require('./routes/importRoutes');
const patientRoutes = require('./routes/patientRoutes');

// 3. Definición de Rutas
app.get('/', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/mammographies', mammographyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/microredes', establishmentRoutes);
app.use('/api/establecimientos', establishmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/import', importRoutes);

// 4. Manejo de Errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
```
---

# File: backend\test_controller_export.js
```js
require('dotenv').config();
const mammographyController = require('./controllers/mammographyController');

const req = {
  query: {}
};

const res = {
  json: (data) => {
    console.log('Respuesta recibida! Longitud:', data.length);
  },
  status: (code) => {
    console.log('Status code:', code);
    return {
      json: (data) => console.log('Error data:', data)
    };
  }
};

async function testController() {
  console.log('Probando exportMammographies controller...');
  await mammographyController.exportMammographies(req, res);
}

testController();

```
---

# File: backend\test_export.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const mammographyService = require('./services/mammographyService');

async function testExport() {
  try {
    console.log('Probando getMammographies con limite 5000...');
    const filters = { soloPositivos: true }; // Probar con filtro de positivos
    const result = await mammographyService.getMammographies(filters, 1, 5000);
    console.log('Éxito! Total recuperados:', result.data.length);
  } catch (error) {
    console.error('Error detectado:');
    console.error(error);
  }
}

testExport();

```
---

# File: backend\test_get_user.js
```js
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

```
---

# File: backend\test_history.js
```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function testHistory() {
  const dni = '15603032';
  console.log('Buscando paciente con DNI:', dni);
  const { data: pacientes, error: pError } = await supabase
    .from('pacientes')
    .select('*')
    .eq('dni', dni);
  
  console.log('Pacientes encontrados:', pacientes);
  if (pError) console.error(pError);

  if (pacientes && pacientes.length > 0) {
    const paciente = pacientes[0];
    console.log('Buscando historial para paciente_id:', paciente.id);
    const { data: historial, error: hError } = await supabase
      .from('detalle_mamografia')
      .select('*, atencion:atenciones!inner(*)')
      .eq('atencion.paciente_id', paciente.id);
    
    console.log('Historial encontrado:', historial?.length);
    if (hError) console.error(hError);
  }
}

testHistory();

```
---

# File: backend\test_stats_res.js
```js
require('dotenv').config();
const { getDashboardStats } = require('./services/mammographyService');

async function testStats() {
  try {
    const stats = await getDashboardStats();
    console.log('Total establecimientos en allEstablecimientos:', stats.allEstablecimientos.length);
    console.log('Primeros 3:', stats.allEstablecimientos.slice(0, 3));
  } catch (error) {
    console.error('Error:', error);
  }
}

testStats();

```
---

# File: backend\config\supabase.js
```js
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
```
---

# File: backend\controllers\establishmentController.js
```js
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

```
---

# File: backend\controllers\importController.js
```js
const {
  processMammographyExcel
} = require('../services/excelService');

const importMammographyExcel = async (req, res) => {

  try {

    const result = await processMammographyExcel();

    res.json({
      success: true,
      result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

};

module.exports = {
  importMammographyExcel
};
```
---

# File: backend\controllers\mammographyController.js
```js
const mammographyService = require('../services/mammographyService');

// GET /api/mammographies?page=1&limit=20&establecimiento_id=...
const listMammographies = async (req, res) => {
  try {
    let { page = 1, limit = 20, establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    
    console.log('--- listMammographies USER ---', { id: req.user.id, rol: req.user.rol, est: req.user.establecimiento_id });

    // Forzar filtros de seguridad según el rol
    const filters = { 
      fecha_inicio, 
      fecha_fin, 
      birads, 
      birads_mx, 
      dni, 
      soloPositivos: soloPositivos === 'true' 
    };

    if (req.user.rol === 'establecimiento') {
      filters.establecimiento_id = req.user.establecimiento_id;
    } else if (req.user.rol === 'microred') {
      filters.microred_id = req.user.microred_id;
    } else {
      // Si es admin, puede filtrar por lo que mande en el query
      filters.establecimiento_id = establecimiento_id;
    }

    const result = await mammographyService.getMammographies(filters, parseInt(page) || 1, parseInt(limit) || 20);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/mammographies/:id
const getMammography = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const data = await mammographyService.getMammographyById(parseInt(id));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/mammographies
const createMammography = async (req, res) => {
  try {
    const data = req.body;
    const result = await mammographyService.createMammography(data);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/mammographies/:id
const updateMammography = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const updateData = req.body;
    await mammographyService.updateMammography(parseInt(id), updateData);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/mammographies/:id
const deleteMammography = async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    await mammographyService.deleteMammography(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/stats/dashboard
const getDashboardStats = async (req, res) => {
  try {
    console.log('--- getDashboardStats USER ---', { id: req.user.id, rol: req.user.rol, est: req.user.establecimiento_id });
    
    // Determinar filtros según el rol
    const filters = {
      establecimiento_id: req.user.rol === 'establecimiento' ? req.user.establecimiento_id : null,
      microred_id: req.user.rol === 'microred' ? req.user.microred_id : null
    };
    
    const stats = await mammographyService.getDashboardStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('--- ERROR EN DASHBOARD STATS ---');
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const exportMammographies = async (req, res) => {
  try {
    let { establecimiento_id, fecha_inicio, fecha_fin, birads, birads_mx, dni, soloPositivos } = req.query;
    
    const filters = { 
      fecha_inicio, 
      fecha_fin, 
      birads, 
      birads_mx, 
      dni, 
      soloPositivos: soloPositivos === 'true' 
    };

    if (req.user.rol === 'establecimiento') {
      filters.establecimiento_id = req.user.establecimiento_id;
    } else if (req.user.rol === 'microred') {
      filters.microred_id = req.user.microred_id;
    } else {
      filters.establecimiento_id = establecimiento_id;
    }
    
    const result = await mammographyService.getMammographies(filters, 1, 5000);
    res.json(result.data);
  } catch (error) {
    console.error('--- ERROR EN EXPORT ---');
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listMammographies,
  getMammography,
  createMammography,
  updateMammography,
  deleteMammography,
  getDashboardStats,
  exportMammographies
};
```
---

# File: backend\controllers\patientController.js
```js
const patientService = require('../services/patientService');
const supabase = require('../config/supabase');

const getPatientHistory = async (req, res) => {
  const { dni } = req.params;
  console.log('--- GET /api/patients/:dni/history ---');
  console.log('DNI recibido:', dni);
  try {
    
    // Validar que el DNI sea numérico para evitar errores de sintaxis en la DB
    if (!dni || isNaN(dni)) {
      return res.status(400).json({ error: 'DNI inválido' });
    }

    const cleanDni = dni.toString().trim();
    
    // Primero obtener el paciente para validar que existe
    const result = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', cleanDni)
      .limit(1);

    console.log('Resultado búsqueda paciente:', result);
    const { data: pacientes, error: pError } = result;

    if (pError) console.error('Error buscando paciente:', pError);
    const paciente = pacientes?.[0];

    if (!paciente) {
      console.warn('Paciente no encontrado para DNI:', cleanDni);
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    // Obtener todas las atenciones y detalles de mamografía de este paciente
    const { data: historial, error: hError } = await supabase
      .from('detalle_mamografia')
      .select(`
        *,
        atencion:atenciones!inner(
          id,
          fecha,
          resultado_general,
          observaciones,
          establecimiento:establecimientos(nombre)
        )
      `)
      .eq('atencion.paciente_id', paciente.id)
      .order('atencion(fecha)', { ascending: false });

    if (hError) throw hError;

    res.json({
      paciente,
      historial
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await patientService.updatePatient(id, updateData);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPatientHistory,
  updatePatient
};
```
---

# File: backend\controllers\userController.js
```js
const userService = require('../services/userService');

const listUsers = async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUser(id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, nombres, rol, establecimiento_id, microred_id } = req.body;
    const newUser = await userService.createUser(email, password, nombres, rol, establecimiento_id, microred_id);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await userService.updateUser(id, updateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
```
---

# File: backend\middleware\auth.js
```js
const supabase = require('../config/supabase');

const verifyToken=[HIDDEN] ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const loadProfile = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
  
  try {
    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('rol, establecimiento_id, microred_id')
      .eq('id', req.user.id)
      .single();
    
    if (error || !perfil) {
      return res.status(403).json({ error: 'Profile not found' });
    }
    
    req.user.rol = perfil.rol;
    req.user.establecimiento_id = perfil.establecimiento_id;
    req.user.microred_id = perfil.microred_id;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error loading profile' });
  }
};

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    // Asumimos que loadProfile ya se ejecutó o lo ejecutamos aquí si no está
    if (!req.user.rol) {
      await loadProfile(req, res, () => {});
      if (res.headersSent) return;
    }
    
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

module.exports = { verifyToken, loadProfile, requireRole };
```
---

# File: backend\routes\establishmentRoutes.js
```js
const express = require("express");
const router = express.Router();
const establishmentController = require("../controllers/establishmentController");
const { verifyToken, loadProfile } = require("../middleware/auth");

router.use(verifyToken);
router.use(loadProfile);
router.get("/microredes", establishmentController.getMicroredes);
router.get("/establecimientos", establishmentController.getEstablecimientos);
router.put("/:id/meta", establishmentController.updateEstablishmentMeta); // Nueva ruta para actualizar meta

module.exports = router;

```
---

# File: backend\routes\importRoutes.js
```js
const express = require('express');
const router = express.Router();

const {
  importMammographyExcel
} = require('../controllers/importController');

router.post('/mammography', importMammographyExcel);

module.exports = router;
```
---

# File: backend\routes\mammographyRoutes.js
```js
const express = require('express');
const router = express.Router();
const mammographyController = require('../controllers/mammographyController');
const { verifyToken, loadProfile, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación y carga de perfil
router.use(verifyToken);
router.use(loadProfile);

// 1. Rutas de Estadísticas (Deben ir antes de las rutas con :id)
router.get('/stats/dashboard', mammographyController.getDashboardStats);
router.get('/export', mammographyController.exportMammographies);

// 2. Rutas CRUD
router.get('/', mammographyController.listMammographies);
router.post('/', requireRole(['admin', 'microred', 'establecimiento']), mammographyController.createMammography);
router.get('/:id', mammographyController.getMammography);
router.put('/:id', requireRole(['admin', 'microred', 'establecimiento']), mammographyController.updateMammography);
router.delete('/:id', requireRole(['admin']), mammographyController.deleteMammography);

module.exports = router;
```
---

# File: backend\routes\patientRoutes.js
```js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken, loadProfile } = require('../middleware/auth');

router.use(verifyToken);
router.use(loadProfile);

router.get('/:dni/history', patientController.getPatientHistory);
router.put('/:id', patientController.updatePatient);

module.exports = router;
```
---

# File: backend\routes\userRoutes.js
```js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, loadProfile, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(loadProfile);

// Rutas accesibles por el propio usuario o admin
router.get('/:id', userController.getUser);
router.put('/:id', (req, res, next) => {
  if (req.user.rol === 'admin' || req.params.id === req.user.id) {
    return userController.updateUser(req, res);
  }
  return res.status(403).json({ error: 'Forbidden' });
});

// Rutas exclusivas de administrador
router.get('/', requireRole(['admin']), userController.listUsers);
router.post('/', requireRole(['admin']), userController.createUser);
router.delete('/:id', requireRole(['admin']), userController.deleteUser);

module.exports = router;
```
---

# File: backend\scripts\createAdmin.js
```js
// scripts/createAdmin.js
require('dotenv').config();
const supabase = require('../config/supabase'); // tu cliente de Supabase con la clave de servicio (service_role)


async function createAdmin() {
  const email = 'admin@ejemplo.com';
  const password=[HIDDEN];
  const nombres = 'Administrador';

  // 1. Crear usuario en auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creando usuario:', authError);
    return;
  }

  console.log('Usuario creado:', authUser.user.id);

  // 2. Crear perfil asociado
  const { error: profileError } = await supabase
    .from('perfiles')
    .insert({
      id: authUser.user.id,
      nombres: nombres,
      rol: 'admin',
      establecimiento_id: null,
      microred_id: null,
    });

  if (profileError) {
    console.error('Error creando perfil:', profileError);
  } else {
    console.log('Perfil admin creado exitosamente');
  }
}

createAdmin();
```
---

# File: backend\services\attentionService.js
```js
const supabase = require('../config/supabase');

const attentionCache = new Map();

// CREAR UNA SOLA ATENCIÓN

const createAttention = async (
  attention
) => {

  try {

    const { data, error } =
      await supabase
        .from('atenciones')
        .insert(attention)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;

  } catch (error) {

    console.error(
      'Error creando atención:',
      error
    );

    throw error;

  }

};

// INSERT MASIVO

const insertAttentionsBatch = async (
  attentions
) => {

  try {

    const { data, error } =
      await supabase
        .from('atenciones')
        .insert(attentions)
        .select(`
          id,
          paciente_id,
          fecha
        `);

    if (error) {
      throw error;
    }

    // CACHE OPCIONAL

    for (const attention of data) {

      const key=[HIDDEN]Error insertando atenciones:',
      error
    );

    throw error;

  }

};

module.exports = {
  createAttention,
  insertAttentionsBatch,
  attentionCache
};
```
---

# File: backend\services\establishmentService.js
```js
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

```
---

# File: backend\services\excelService.js
```js
const XLSX = require('xlsx');
const {
  normalizeText,
  normalizeDni,
  normalizeDate,
  normalizePhone
} = require('../utils/normalize');
const {
  isValidDni,
  isValidName
} = require('../utils/validators');
const {
  logError
} = require('../utils/logger');
const {
  insertPatientsBatch
} = require('./patientService');
const {
  insertAttentionsBatch
} = require('./attentionService');
const {
  insertMammographyBatch
} = require('./mammographyService');
const {
  loadEstablishmentsCache,
  getEstablishmentId,
  getAllEstablishmentNames,
  updateEstablishmentMeta
} = require('./establishmentService');
const { detectColumnMapping, getField } = require('../utils/excelHelpers');

// =============================================
// SOLO PROCESAR HOJAS QUE REALMENTE TIENEN DATOS
// =============================================
const VALID_SHEETS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY']; // Agrega más si tienen estructura similar
const META_SHEET = 'METAS Y AVANCES 2026';
const BATCH_SIZE = 100;

const processMammographyExcel = async () => {
  const FILE_NAME = 'MAMOGRAFIA 2026.xlsx';

  console.log('📂 Cargando establecimientos...');
  await loadEstablishmentsCache();

  const workbook = XLSX.readFile(`./uploads/${FILE_NAME}`);

  // 🎯 IMPORTAR METAS PRIMERO
  if (workbook.SheetNames.includes(META_SHEET)) {
    console.log(`\n🎯 Procesando hoja de metas: ${META_SHEET}`);
    const metaSheet = workbook.Sheets[META_SHEET];
    const metaRows = XLSX.utils.sheet_to_json(metaSheet);
    let metasActualizadas = 0;

    for (const row of metaRows) {
      const nombreEst = row['ESTABLECIMIENTO DE SALUD'];
      const metaAnual = row['META ANUAL'];
      if (nombreEst && metaAnual) {
        const ok = await updateEstablishmentMeta(nombreEst, parseInt(metaAnual));
        if (ok) metasActualizadas++;
      }
    }
    console.log(`✅ Metas actualizadas para ${metasActualizadas} establecimientos.`);
  }

  const sheetsToProcess = workbook.SheetNames.filter(sheet =>
    VALID_SHEETS.includes(sheet.toUpperCase())
  );
  console.log('📑 Hojas a procesar:', sheetsToProcess);

  // =============================================
  // CONTADORES GLOBALES
  // =============================================
  let totalFilasExcel = 0;
  let totalInvalidRows = 0;
  let totalImportedPatients = 0;
  let totalImportedAttentions = 0;
  let totalImportedMammographies = 0;
  let recordsBatch = [];

  for (const sheetName of sheetsToProcess) {
    console.log(`\n📄 Procesando hoja: ${sheetName}`);
    
    const sheet = workbook.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    // =============================================
    // FILTRAR FILAS VACÍAS (TODAS LAS CELDAS NULL/UNDEFINED/VACÍO)
    // =============================================
    rows = rows.filter(row => {
      return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
    });
    
    if (rows.length === 0) {
      console.log(`⚠️ Hoja ${sheetName} no tiene filas con datos, saltando.`);
      continue;
    }
    
    // Verificar que la primera fila tenga columnas útiles (DNI o nombre)
    const sampleRow = rows[0];
    const hasUsefulColumns = sampleRow && (sampleRow['DNI'] !== undefined || sampleRow['APELLIDOS Y NOMBRES'] !== undefined);
    if (!hasUsefulColumns) {
      console.log(`⚠️ Hoja ${sheetName} no tiene columnas de datos (DNI o nombre), saltando.`);
      continue;
    }
    
    // Detectar mapeo de columnas
    const mapping = detectColumnMapping(sampleRow, sheetName);
    console.log(`📋 Mapeo detectado para ${sheetName}:`, Object.keys(mapping).join(', '));
    console.log(`📊 Filas encontradas en hoja (después de limpiar vacías): ${rows.length}`);
    
    // Mostrar las primeras 5 columnas disponibles (opcional)
    if (rows[0]) {
      console.log('📋 Columnas disponibles:', Object.keys(rows[0]).slice(0, 10));
    }
    
    // =============================================
    // CONTADORES POR HOJA (SE REINICIAN EN CADA ITERACIÓN)
    // =============================================
    let filasProcesadasOK = 0;
    let rechazadosDniVacio = 0;
    let rechazadosNombreVacio = 0;
    let rechazadosDniInvalido = 0;
    let rechazadosNombreInvalido = 0;
    let rechazadosEstablecimiento = 0;
    let rechazadosError = 0;
    
    totalFilasExcel += rows.length;
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      // Obtener valores con el helper
      const dniRaw = getField(row, mapping, 'dni');
      const nombreRaw = getField(row, mapping, 'nombres');
      
      if (!dniRaw || dniRaw === '') {
        rechazadosDniVacio++;
        totalInvalidRows++;
        console.log(`❌ Fila ${rowIndex + 1}: DNI vacío`);
        continue;
      }
      if (!nombreRaw || nombreRaw === '') {
        rechazadosNombreVacio++;
        totalInvalidRows++;
        console.log(`❌ Fila ${rowIndex + 1}: Nombre vacío (DNI: ${dniRaw})`);
        continue;
      }
      
      try {
        const dni = normalizeDni(dniRaw);
        const nombres = normalizeText(nombreRaw);
        const edadRaw = getField(row, mapping, 'edad');
        const edad = edadRaw ? Number(edadRaw) : null;
        
        const establecimientoRaw = getField(row, mapping, 'establecimiento');
        const establecimientoNombre = establecimientoRaw ? normalizeText(establecimientoRaw) : null;
        
        // Validaciones
        if (!isValidDni(dni)) {
          rechazadosDniInvalido++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `DNI inválido: ${dni} (original: ${dniRaw})`
          });
          continue;
        }
        if (!isValidName(nombres)) {
          rechazadosNombreInvalido++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `Nombre inválido: ${nombres} (original: ${nombreRaw})`
          });
          continue;
        }
        if (!establecimientoNombre) {
          rechazadosEstablecimiento++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `Establecimiento vacío`
          });
          continue;
        }
        const establecimientoId = getEstablishmentId(establecimientoNombre);
        if (!establecimientoId) {
          rechazadosEstablecimiento++;
          totalInvalidRows++;
          logError({
            file: FILE_NAME,
            sheet: sheetName,
            row: rowIndex + 1,
            message: `Establecimiento no encontrado: ${establecimientoNombre}`
          });
          continue;
        }
        
        // Extraer otros campos
        const historia_clinicaRaw = getField(row, mapping, 'hcl');
        const historia_clinica = historia_clinicaRaw ? historia_clinicaRaw.toString().trim() : null;
        const telefonoRaw = getField(row, mapping, 'telefono');
        const telefono = telefonoRaw ? normalizePhone(telefonoRaw) : null;
        const direccionRaw = getField(row, mapping, 'direccion');
        const direccion = direccionRaw ? normalizeText(direccionRaw) : null;
        const distritoRaw = getField(row, mapping, 'distrito');
        const distrito = distritoRaw ? normalizeText(distritoRaw) : null;
        
        // Fechas y textos de mamografía
        const fecha_toma_mx = normalizeDate(getField(row, mapping, 'fecha_toma_mx'));
        const resultados_mx = normalizeText(getField(row, mapping, 'resultados'));
        const birads_mx = (normalizeText(getField(row, mapping, 'birads_mx')) || '').substring(0, 20); // truncado a 20 caracteres
        const sugerencia_mx = normalizeText(getField(row, mapping, 'sugerencia'));
        const fecha_recepcion = normalizeDate(getField(row, mapping, 'fecha_recepcion'));
        const fecha_recojo = normalizeDate(getField(row, mapping, 'fecha_recojo'));
        const fecha_entrega = normalizeDate(getField(row, mapping, 'fecha_entrega'));
        const cita_ecografia = normalizeText(getField(row, mapping, 'cita_ecografia'));
        const resultados_ecografia = normalizeText(getField(row, mapping, 'resultados_ecografia'));
        const birads_ecografia = (normalizeText(getField(row, mapping, 'birads_ecografia')) || '').substring(0, 20);
        const sugerencias_ecografia = normalizeText(getField(row, mapping, 'sugerencias_ecografia'));
        const fecha_toma_magnificacion = normalizeDate(getField(row, mapping, 'fecha_toma_magnificacion'));
        const resultados_magnificacion = normalizeText(getField(row, mapping, 'resultados_magnificacion'));
        const birads_magnificacion = (normalizeText(getField(row, mapping, 'birads_magnificacion')) || '').substring(0, 20);
        const sugerencias_magnificacion = normalizeText(getField(row, mapping, 'sugerencias_magnificacion'));
        const fecha_referencia_hrh = normalizeDate(getField(row, mapping, 'fecha_referencia_hrh'));
        const procedimiento_fecha = normalizeText(getField(row, mapping, 'procedimiento_fecha'));
        const tratamiento = normalizeText(getField(row, mapping, 'tratamiento'));
        const tratamiento_otra = normalizeText(getField(row, mapping, 'tratamiento_otra'));
        const referencia_otra = normalizeText(getField(row, mapping, 'referencia_otra'));
        const situacion_actual = normalizeText(getField(row, mapping, 'situacion_actual'));
        
        // Si no hay fecha de toma de mamografía, intentar con la fecha de la fila (a veces viene en columna 'FECHA ')
        let fecha_toma_mx_final = fecha_toma_mx;
        if (!fecha_toma_mx_final && row['FECHA ']) {
          fecha_toma_mx_final = normalizeDate(row['FECHA ']);
        }
        
        recordsBatch.push({
          paciente: { dni, nombres, edad, historia_clinica, telefono, direccion, distrito },
          atencion: { establecimiento_id: establecimientoId, campaña_id: 1, fecha: new Date(), estado: 'REGISTRADO' },
          mamografia: {
            birads: birads_ecografia,
            ecografia: resultados_ecografia,
            magnificacion: resultados_magnificacion,
            resultado: resultados_mx,
            fecha_resultado: fecha_recepcion,
            fecha_entrega: fecha_entrega,
            tratamiento: tratamiento,
            fecha_toma_mx: fecha_toma_mx_final,
            resultados_mx: resultados_mx,
            birads_mx: birads_mx,
            sugerencia_mx: sugerencia_mx,
            fecha_recepcion_resultados: fecha_recepcion,
            fecha_recojo_resultados: fecha_recojo,
            cita_ecografia: cita_ecografia,
            resultados_ecografia: resultados_ecografia,
            birads_ecografia: birads_ecografia,
            sugerencias_ecografia: sugerencias_ecografia,
            fecha_toma_magnificacion: fecha_toma_magnificacion,
            resultados_magnificacion: resultados_magnificacion,
            birads_magnificacion: birads_magnificacion,
            sugerencias_magnificacion: sugerencias_magnificacion,
            fecha_referencia_hrh: fecha_referencia_hrh,
            procedimiento_fecha: procedimiento_fecha,
            tratamiento_otra_institucion: tratamiento_otra,
            referencia_otra_institucion: referencia_otra,
            situacion_actual: situacion_actual
          }
        });
        
        filasProcesadasOK++;
        
        if (filasProcesadasOK <= 5) {
          console.log(`✅ Fila ${rowIndex + 1}: VÁLIDA - DNI: ${dni}, Nombre: ${nombres}, Establecimiento ID: ${establecimientoId}`);
        }
        
        if (recordsBatch.length >= BATCH_SIZE) {
          console.log(`\n🔄 Procesando lote de ${recordsBatch.length} registros...`);
          const result = await processBatch(recordsBatch);
          totalImportedPatients += result.importedPatients;
          totalImportedAttentions += result.importedAttentions;
          totalImportedMammographies += result.importedMammographies;
          console.log(`✅ Lote procesado: Pacientes: ${result.importedPatients}, Atenciones: ${result.importedAttentions}, Mamografías: ${result.importedMammographies}`);
          recordsBatch = [];
        }
        
      } catch (error) {
        rechazadosError++;
        totalInvalidRows++;
        logError({
          file: FILE_NAME,
          sheet: sheetName,
          row: rowIndex + 1,
          message: error.message
        });
        console.error(`💥 Error en fila ${rowIndex + 1}: ${error.message}`);
      }
    }
    
    // =============================================
    // DIAGNÓSTICO DE LA HOJA ACTUAL
    // =============================================
    console.log(`\n📊 DIAGNÓSTICO DE HOJA ${sheetName}:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Filas procesadas OK:        ${filasProcesadasOK}`);
    console.log(`❌ Filas rechazadas:`);
    console.log(`   - DNI vacío:                ${rechazadosDniVacio}`);
    console.log(`   - Nombre vacío:             ${rechazadosNombreVacio}`);
    console.log(`   - DNI inválido:             ${rechazadosDniInvalido}`);
    console.log(`   - Nombre inválido:          ${rechazadosNombreInvalido}`);
    console.log(`   - Establecimiento inválido: ${rechazadosEstablecimiento}`);
    console.log(`   - Error inesperado:         ${rechazadosError}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📈 TOTAL FILAS EN HOJA:        ${rows.length}`);
    const totalProcesadasHoja = filasProcesadasOK + rechazadosDniVacio + rechazadosNombreVacio + rechazadosDniInvalido + rechazadosNombreInvalido + rechazadosEstablecimiento + rechazadosError;
    console.log(`📊 TOTAL PROCESADAS (OK+ERROR): ${totalProcesadasHoja}`);
    console.log(`⚠️  Diferencia (deben ser 0):   ${rows.length - totalProcesadasHoja}`);
  }
  
  // Procesar lote final (registros que quedaron)
  if (recordsBatch.length > 0) {
    console.log(`\n🔄 Procesando lote final de ${recordsBatch.length} registros...`);
    const result = await processBatch(recordsBatch);
    totalImportedPatients += result.importedPatients;
    totalImportedAttentions += result.importedAttentions;
    totalImportedMammographies += result.importedMammographies;
    console.log(`✅ Lote final procesado: Pacientes: ${result.importedPatients}, Atenciones: ${result.importedAttentions}, Mamografías: ${result.importedMammographies}`);
  }
  
  // =============================================
  // RESUMEN FINAL GLOBAL
  // =============================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN FINAL DEL PROCESO:`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📑 Hojas procesadas:           ${sheetsToProcess.length}`);
  console.log(`📄 Total filas en Excel:       ${totalFilasExcel}`);
  console.log(`✅ Filas válidas procesadas:   ${totalImportedAttentions}`); // cada fila válida = una atención
  console.log(`❌ Filas inválidas:            ${totalInvalidRows}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`💾 REGISTROS IMPORTADOS:`);
  console.log(`   - Pacientes:                ${totalImportedPatients}`);
  console.log(`   - Atenciones:               ${totalImportedAttentions}`);
  console.log(`   - Mamografías:              ${totalImportedMammographies}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`\n🔍 VERIFICACIÓN DE CONSISTENCIA:`);
  console.log(`   Atenciones vs Filas válidas: ${totalImportedAttentions} vs ${totalImportedAttentions} ✅`);
  console.log(`   Mamografías vs Atenciones:   ${totalImportedMammographies} vs ${totalImportedAttentions} ${totalImportedMammographies === totalImportedAttentions ? '✅' : '⚠️'}`);
  
  return {
    success: true,
    processedSheets: sheetsToProcess.length,
    importedPatients: totalImportedPatients,
    importedAttentions: totalImportedAttentions,
    importedMammographies: totalImportedMammographies,
    invalidRows: totalInvalidRows,
    diagnostico: {
      totalFilasExcel,
      filasValidas: totalImportedAttentions,
      filasInvalidas: totalInvalidRows
    }
  };
};

// ===============================
// PROCESAR LOTE (no cambia)
// ===============================
const processBatch = async (recordsBatch) => {
  console.log(`\n🔄 PROCESANDO LOTE DE ${recordsBatch.length} REGISTROS`);
  
  const uniquePatientsMap = new Map();
  for (const record of recordsBatch) {
    const dni = record.paciente.dni;
    if (!uniquePatientsMap.has(dni)) {
      uniquePatientsMap.set(dni, {
        dni: record.paciente.dni,
        nombres: record.paciente.nombres,
        edad: record.paciente.edad,
        historia_clinica: record.paciente.historia_clinica,
        telefono: record.paciente.telefono,
        direccion: record.paciente.direccion,
        distrito: record.paciente.distrito
      });
    }
  }
  console.log(`   📊 Estadísticas del lote:`);
  console.log(`      - Total registros:     ${recordsBatch.length}`);
  console.log(`      - Pacientes únicos:    ${uniquePatientsMap.size}`);
  console.log(`      - Registros duplicados: ${recordsBatch.length - uniquePatientsMap.size}`);
  
  const patientsData = Array.from(uniquePatientsMap.values());
  const insertedPatients = await insertPatientsBatch(patientsData);
  console.log(`      ✅ Pacientes insertados: ${insertedPatients.length}`);
  
  const patientIdByDni = new Map();
  for (const patient of insertedPatients) {
    patientIdByDni.set(patient.dni, patient.id);
  }
  
  const attentionsData = recordsBatch.map(record => ({
    paciente_id: patientIdByDni.get(record.paciente.dni),
    establecimiento_id: record.atencion.establecimiento_id,
    campaña_id: record.atencion.campaña_id,
    fecha: record.atencion.fecha,
    estado: record.atencion.estado
  }));
  
  const insertedAttentions = await insertAttentionsBatch(attentionsData);
  console.log(`      ✅ Atenciones insertadas: ${insertedAttentions.length}`);
  
  const attentionMap = new Map();
  for (let i = 0; i < insertedAttentions.length; i++) {
    attentionMap.set(i, insertedAttentions[i].id);
  }
  
  const mammographyData = recordsBatch.map((record, index) => ({
    atencion_id: attentionMap.get(index),
    birads: record.mamografia.birads,
    ecografia: record.mamografia.ecografia,
    magnificacion: record.mamografia.magnificacion,
    fecha_resultado: record.mamografia.fecha_resultado,
    fecha_entrega: record.mamografia.fecha_entrega,
    tratamiento: record.mamografia.tratamiento,
    fecha_toma_mx: record.mamografia.fecha_toma_mx,
    resultados_mx: record.mamografia.resultados_mx,
    birads_mx: record.mamografia.birads_mx,
    sugerencia_mx: record.mamografia.sugerencia_mx,
    fecha_recepcion_resultados: record.mamografia.fecha_recepcion_resultados,
    fecha_recojo_resultados: record.mamografia.fecha_recojo_resultados,
    cita_ecografia: record.mamografia.cita_ecografia,
    resultados_ecografia: record.mamografia.resultados_ecografia,
    birads_ecografia: record.mamografia.birads_ecografia,
    sugerencias_ecografia: record.mamografia.sugerencias_ecografia,
    fecha_toma_magnificacion: record.mamografia.fecha_toma_magnificacion,
    resultados_magnificacion: record.mamografia.resultados_magnificacion,
    birads_magnificacion: record.mamografia.birads_magnificacion,
    sugerencias_magnificacion: record.mamografia.sugerencias_magnificacion,
    fecha_referencia_hrh: record.mamografia.fecha_referencia_hrh,
    procedimiento_fecha: record.mamografia.procedimiento_fecha,
    tratamiento_otra_institucion: record.mamografia.tratamiento_otra_institucion,
    referencia_otra_institucion: record.mamografia.referencia_otra_institucion,
    situacion_actual: record.mamografia.situacion_actual
  }));
  
  const insertedMammographies = await insertMammographyBatch(mammographyData);
  console.log(`      ✅ Mamografías insertadas: ${insertedMammographies.length}`);

  // 🔔 Notificar casos positivos (BI-RADS 4, 5, 6)
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
  const positiveCases = recordsBatch
    .filter(r => POSITIVOS_REGEX.test((r.mamografia.birads_mx || '').trim()))
    .map(r => ({
      dni: r.paciente.dni,
      nombres: r.paciente.nombres,
      birads_mx: r.mamografia.birads_mx
    }));

  if (positiveCases.length > 0) {
    console.log(`      🔔 Detectados ${positiveCases.length} casos positivos. Iniciando notificaciones...`);
    notifyPositiveCases(positiveCases).catch(err => console.error('Error enviando notificaciones:', err));
  }
  
  return {
    importedPatients: insertedPatients.length,
    importedAttentions: insertedAttentions.length,
    importedMammographies: insertedMammographies.length
  };
};

module.exports = {
  processMammographyExcel
};
```
---

# File: backend\services\importService.js
```js

```
---

# File: backend\services\mammographyService.js
```js
// services/mammographyService.js
const supabase = require('../config/supabase');
const { notifyPositiveCases } = require('./notificationService');

const insertMammographyBatch = async (mammographyData) => {
  if (!mammographyData || mammographyData.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('detalle_mamografia')
      .insert(mammographyData)
      .select();

    if (error) throw error;
    
    console.log(`✅ Insertadas ${data.length} detalle_mamografia`);
    return data;
  } catch (error) {
    console.error('❌ Error en insertMammographyBatch:', error.message);
    throw error;
  }
};

// Obtener listado de mamografías con paginación y filtros opcionales
const getMammographies = async (filters, page = 1, limit = 20) => {
  console.log('--- getMammographies FILTERS ---', filters);
  
  let query = supabase
    .from('detalle_mamografia')
    .select(`
      *,
      atencion:atenciones!inner(
        *,
        establecimiento:establecimientos(nombre, microred_id),
        paciente:pacientes!inner(*)
      )
    `, { count: 'exact' });

  // Aplicar filtros de seguridad (obligatorios si vienen en filters)
  if (filters.establecimiento_id) {
    query = query.eq('atencion.establecimiento_id', filters.establecimiento_id);
  } else if (filters.microred_id) {
    query = query.eq('atencion.establecimiento.microred_id', filters.microred_id);
  }

  // Aplicar otros filtros opcionales
  if (filters.fecha_inicio) {
    query = query.gte('atencion.fecha', filters.fecha_inicio);
  }
  if (filters.fecha_fin) {
    query = query.lte('atencion.fecha', filters.fecha_fin);
  }
  if (filters.birads) {
    query = query.eq('birads', filters.birads);
  }
  if (filters.birads_mx) {
    query = query.ilike('birads_mx', `%${filters.birads_mx}%`);
  }
  
  if (filters.dni) {
    const q = `%${filters.dni}%`;
    query = query.or(`dni.ilike.${q},nombres.ilike.${q}`, { foreignTable: 'atenciones.pacientes' });
  }

  if (filters.soloPositivos) {
    // Filtro inclusivo para 4, 5 y 6 en varios formatos
    query = query.or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.BI-RADS 5%,birads_mx.ilike.BI-RADS 6%,birads_mx.ilike.4%,birads_mx.ilike.5%,birads_mx.ilike.6%,birads_mx.ilike.birads: 4%,birads_mx.ilike.birads: 5%,birads_mx.ilike.birads: 6%');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error en getMammographies query:', error);
    throw error;
  }

  if (filters.soloPositivos) {
    const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
    data = (data || []).filter(r => POSITIVOS_REGEX.test((r.birads_mx || '').trim()));
    count = data.length;
  }

  return { data, total: count, page, limit };
};

// Obtener detalle completo de una mamografía por ID
const getMammographyById = async (id) => {
  const { data, error } = await supabase
    .from('detalle_mamografia')
    .select(`
      *,
      atencion:atenciones(
        *,
        establecimiento:establecimientos(*),
        paciente:pacientes(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Actualizar una mamografía (incluye datos de atención y paciente)
const updateMammography = async (id, updateData) => {
  console.log('--- updateMammography updateData ---', updateData);
  const { atencion, paciente, ...mammoData } = updateData;

  // Si vienen datos planos (compatibilidad con frontend actual)
  let finalMammoData = { ...mammoData };
  let finalAtencion = atencion || null;
  let finalPaciente = paciente || null;

  // Si es un objeto plano desde el modal
  if (!atencion && !paciente && updateData.dni) {
    // Buscar la mamografía actual para obtener IDs
    const current = await getMammographyById(id);
    if (current) {
      finalAtencion = {
        id: current.atencion_id,
        fecha: updateData.fecha,
        establecimiento_id: updateData.establecimiento_id || null
      };
      finalPaciente = {
        id: current.atencion?.paciente?.id,
        dni: updateData.dni,
        nombres: updateData.nombres
      };
      
      // Limpiar campos que no van en detalle_mamografia
      delete finalMammoData.dni;
      delete finalMammoData.nombres;
      delete finalMammoData.fecha;
      delete finalMammoData.establecimiento_id;
      
      // Sincronizar birads_mx con birads
      // Si el usuario envió 'birads' (el número), actualizamos 'birads_mx' (el texto)
      if (updateData.birads !== undefined) {
        finalMammoData.birads = updateData.birads;
        if (updateData.birads) {
          finalMammoData.birads_mx = `BI-RADS ${updateData.birads}`;
        } else {
          finalMammoData.birads_mx = null;
        }
      }
    } else {
      throw new Error('No se encontró el registro de mamografía a actualizar');
    }
  }

  // Actualizar paciente si se envía información
  if (finalPaciente && finalPaciente.id) {
    const { id: pId, ...pData } = finalPaciente;
    const { error: pacienteError } = await supabase
      .from('pacientes')
      .update(pData)
      .eq('id', pId);
    if (pacienteError) throw pacienteError;
  }

  // Actualizar atención
  if (finalAtencion && finalAtencion.id) {
    const { id: aId, ...aData } = finalAtencion;
    const { error: atencionError } = await supabase
      .from('atenciones')
      .update(aData)
      .eq('id', aId);
    if (atencionError) throw atencionError;
  }

  // Actualizar detalle mamografía
  if (Object.keys(finalMammoData).length > 0) {
    const { error: mammoError } = await supabase
      .from('detalle_mamografia')
      .update(finalMammoData)
      .eq('id', id);
    if (mammoError) throw mammoError;

    // 🔔 Notificar si el BI-RADS actualizado es positivo
    if (finalMammoData.birads_mx) {
      const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
      if (POSITIVOS_REGEX.test(finalMammoData.birads_mx)) {
        // Obtener datos del paciente para el correo
        const current = await getMammographyById(id);
        const positiveCase = [{
          dni: current.atencion?.paciente?.dni,
          nombres: current.atencion?.paciente?.nombres,
          birads_mx: finalMammoData.birads_mx
        }];
        notifyPositiveCases(positiveCase).catch(err => console.error('Error enviando notificación (update):', err));
      }
    }
  }

  return { success: true };
};

const createMammography = async (data) => {
  console.log('--- createMammography data ---', data);
  const { dni, nombres, fecha, establecimiento_id, birads, resultados_mx, sugerencia_mx } = data;

  // 1. Buscar o Crear Paciente
  let pacienteId;
  const { data: existingPaciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('dni', dni)
    .single();

  if (existingPaciente) {
    pacienteId = existingPaciente.id;
    // Opcional: actualizar nombre si cambió
    await supabase.from('pacientes').update({ nombres }).eq('id', pacienteId);
  } else {
    const { data: newPaciente, error: pError } = await supabase
      .from('pacientes')
      .insert({ dni, nombres })
      .select()
      .single();
    if (pError) throw pError;
    pacienteId = newPaciente.id;
  }

  // 2. Crear Atención
  const { data: newAtencion, error: aError } = await supabase
    .from('atenciones')
    .insert({
      paciente_id: pacienteId,
      establecimiento_id: establecimiento_id || null,
      fecha: fecha || new Date().toISOString().split('T')[0],
      estado: 'REGISTRADO',
      campaña_id: 1
    })
    .select()
    .single();
  if (aError) throw aError;

  // 3. Crear Detalle Mamografía
  const { data: newMammo, error: mError } = await supabase
    .from('detalle_mamografia')
    .insert({
      atencion_id: newAtencion.id,
      birads,
      birads_mx: birads ? `BI-RADS ${birads}` : null,
      resultados_mx,
      sugerencia_mx
    })
    .select()
    .single();
  if (mError) throw mError;

  // 🔔 Notificar si es un caso positivo
  const birads_mx = birads ? `BI-RADS ${birads}` : null;
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
  if (birads_mx && POSITIVOS_REGEX.test(birads_mx)) {
    const positiveCase = [{
      dni,
      nombres,
      birads_mx
    }];
    notifyPositiveCases(positiveCase).catch(err => console.error('Error enviando notificación (create):', err));
  }

  return newMammo;
};

// Eliminar una mamografía (borrado físico en cascada)
const deleteMammography = async (id) => {
  // Primero obtener la atención_id para eliminar en orden
  const { data: mammo, error: fetchError } = await supabase
    .from('detalle_mamografia')
    .select('atencion_id')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  // Eliminar detalle mamografía
  const { error: delMammo } = await supabase
    .from('detalle_mamografia')
    .delete()
    .eq('id', id);
  if (delMammo) throw delMammo;

  // Eliminar atención (en cascada borraría referencias, si las hay)
  const { error: delAtencion } = await supabase
    .from('atenciones')
    .delete()
    .eq('id', mammo.atencion_id);
  if (delAtencion) throw delAtencion;

  // Nota: paciente no se elimina, queda histórico.
  return { success: true };
};

// Helper: Supabase devuelve máximo 1000 filas por defecto.
const fetchAllRows = async (queryBuilder) => {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }
  return allData;
};

const getDashboardStats = async (filters = {}) => {
  const { establecimiento_id, microred_id } = filters;

  // Total atenciones
  let query1 = supabase.from('atenciones').select('*', { count: 'exact', head: true });
  if (establecimiento_id) query1 = query1.eq('establecimiento_id', establecimiento_id);
  
  if (microred_id) {
    query1 = supabase
      .from('atenciones')
      .select('id, establecimiento:establecimientos!inner(microred_id)', { count: 'exact', head: true })
      .eq('establecimiento.microred_id', microred_id);
  }

  const { count: totalAtenciones, error: err1 } = await query1;
  if (err1) throw err1;

  // Total pacientes únicos
  let finalTotalPacientes = 0;
  if (establecimiento_id || microred_id) {
    let queryPacs = supabase.from('atenciones').select('paciente_id');
    if (establecimiento_id) queryPacs = queryPacs.eq('establecimiento_id', establecimiento_id);
    if (microred_id) {
      queryPacs = supabase.from('atenciones')
                 .select('paciente_id, establecimiento:establecimientos!inner(microred_id)')
                 .eq('establecimiento.microred_id', microred_id);
    }
    const pacs = await fetchAllRows(queryPacs);
    finalTotalPacientes = new Set(pacs.map(p => p.paciente_id)).size;
  } else {
    const { count, error: err2 } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true });
    if (err2) throw err2;
    finalTotalPacientes = count;
  }

  // Total positivas
  let query3 = supabase
    .from('detalle_mamografia')
    .select(`
      birads_mx,
      atencion:atenciones!inner(
        establecimiento_id,
        establecimiento:establecimientos(microred_id),
        paciente:pacientes(dni)
      )
    `)
    .or('birads_mx.ilike.BI-RADS 4%,birads_mx.ilike.BI-RADS 5%,birads_mx.ilike.BI-RADS 6%,birads_mx.ilike.4%,birads_mx.ilike.5%,birads_mx.ilike.6%');
  
  if (establecimiento_id) {
    query3 = query3.eq('atencion.establecimiento_id', establecimiento_id);
  } else if (microred_id) {
    query3 = query3.eq('atencion.establecimiento.microred_id', microred_id);
  }
  
  const biradsPositivos = await fetchAllRows(query3);
  
  const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;
  const seenDnis = new Set();
  (biradsPositivos || []).forEach(r => {
    if (POSITIVOS_REGEX.test((r.birads_mx || '').trim())) {
      const dni = r.atencion?.paciente?.dni;
      if (dni) seenDnis.add(dni);
    }
  });
  const totalPositivas = seenDnis.size;

  const porcentajePositivas = totalAtenciones ? ((totalPositivas / totalAtenciones) * 100).toFixed(2) : 0;

  // Atenciones por mes
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  let query4 = supabase
    .from('atenciones')
    .select('fecha, establecimiento:establecimientos(microred_id)')
    .gte('fecha', sixMonthsAgo.toISOString().split('T')[0])
    .order('fecha');
  
  if (establecimiento_id) {
    query4 = query4.eq('establecimiento_id', establecimiento_id);
  } else if (microred_id) {
    query4 = supabase
      .from('atenciones')
      .select('fecha, establecimiento:establecimientos!inner(microred_id)')
      .gte('fecha', sixMonthsAgo.toISOString().split('T')[0])
      .eq('establecimiento.microred_id', microred_id)
      .order('fecha');
  }

  const atencionesPorMesArray = await fetchAllRows(query4);
  const meses = {};
  atencionesPorMesArray.forEach(row => {
    const mes = row.fecha.slice(0, 7);
    meses[mes] = (meses[mes] || 0) + 1;
  });

  // Distribución BI-RADS
  let query5 = supabase
    .from('detalle_mamografia')
    .select(`
      birads_mx,
      atencion:atenciones!inner(
        establecimiento_id,
        establecimiento:establecimientos(microred_id)
      )
    `);
  if (establecimiento_id) {
    query5 = query5.eq('atencion.establecimiento_id', establecimiento_id);
  } else if (microred_id) {
    query5 = query5.eq('atencion.establecimiento.microred_id', microred_id);
  }
  
  const biradsDist = await fetchAllRows(query5);
  const distribucionBirads = {};
  biradsDist.forEach(row => {
    let raw = (row.birads_mx || '').trim().toUpperCase();
    if (!raw) return;
    let label = raw;
    const match = raw.match(/BI-RADS\s*[:\s]*([0-6][ABC]?)/i);
    if (match) label = `BI-RADS ${match[1]}`;
    distribucionBirads[label] = (distribucionBirads[label] || 0) + 1;
  });

  // Establecimientos
  const { data: allEstsDB } = await supabase
    .from('establecimientos')
    .select('id, nombre, meta_anual, microred_id, microred:microredes(nombre)');

  let query7 = supabase.from('atenciones').select('establecimiento_id');
  if (establecimiento_id) query7 = query7.eq('establecimiento_id', establecimiento_id);
  const counts = await fetchAllRows(query7);

  const atencionesMap = {};
  counts.forEach(c => {
    if (c.establecimiento_id) atencionesMap[c.establecimiento_id] = (atencionesMap[c.establecimiento_id] || 0) + 1;
  });

  const allEstablecimientos = allEstsDB
    .filter(est => {
      if (establecimiento_id) return est.id === parseInt(establecimiento_id);
      if (microred_id) return est.microred_id === parseInt(microred_id);
      return true;
    })
    .map(est => ({
      id: est.id,
      nombre: est.nombre,
      microred: est.microred?.nombre || 'SIN MICRORED',
      cantidad: atencionesMap[est.id] || 0,
      meta: est.meta_anual || 0
    })).sort((a, b) => b.cantidad - a.cantidad);

  return {
    totalAtenciones,
    totalPacientes: finalTotalPacientes,
    totalPositivas,
    porcentajePositivas,
    atencionesPorMes: Object.entries(meses).map(([mes, cantidad]) => ({ mes, cantidad })),
    distribucionBirads,
    topEstablecimientos: allEstablecimientos.slice(0, 5),
    allEstablecimientos
  };
};

module.exports = {
  insertMammographyBatch,
  getMammographies,
  getMammographyById,
  updateMammography,
  createMammography,
  deleteMammography,
  getDashboardStats
};

```
---

# File: backend\services\notificationservice.js
```js
const nodemailer = require("nodemailer");
const supabase = require('../config/supabase');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Contraseña de aplicación de Google
  },
});

const sendPositiveCaseAlert = async (userEmail, patientData) => {
  const mailOptions = {
    from: `"ONCO - SISTEM" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "⚠️ ALERTA: Caso Positivo Detectado (BI-RADS 4+)",
    html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #d32f2f;">Nuevo Caso Positivo Detectado</h2>
            <p>Se ha registrado un resultado crítico durante la importación:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
              <ul style="list-style: none; padding: 0;">
                <li><strong>Paciente:</strong> ${patientData.nombres}</li>
                <li><strong>DNI:</strong> ${patientData.dni}</li>
                <li><strong>Resultado:</strong> <span style="color: #d32f2f; font-weight: bold;">${patientData.birads_mx}</span></li>
              </ul>
            </div>
            <p>Por favor, ingrese al sistema para realizar el seguimiento correspondiente.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888;">Este es un mensaje automático de ONCO - SISTEM.</p>
          </div>
        `,
  };
  return transporter.sendMail(mailOptions);
};

const notifyPositiveCases = async (positiveCases) => {
  try {
    if (positiveCases.length === 0) return;

    // 1. Obtener usuarios con notificaciones activadas
    const { data: users, error } = await supabase
      .from('perfiles')
      .select('id, notificaciones_email')
      .eq('notificaciones_email', true);
    
    if (error) throw error;
    if (users.length === 0) return;

    // 2. Obtener emails de Auth para esos usuarios
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // 3. Enviar correos
    for (const caseData of positiveCases) {
      const patientInfo = {
        nombres: caseData.nombres,
        dni: caseData.dni,
        birads_mx: caseData.birads_mx
      };

      for (const userProfile of users) {
        const authUser = authUsers.find(u => u.id === userProfile.id);
        if (authUser && authUser.email) {
          console.log(`📧 Enviando alerta de caso positivo a: ${authUser.email}`);
          await sendPositiveCaseAlert(authUser.email, patientInfo);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en notifyPositiveCases:', error);
  }
};

module.exports = { sendPositiveCaseAlert, notifyPositiveCases };

```
---

# File: backend\services\patientService.js
```js
// services/patientService.js
const supabase = require('../config/supabase');

const insertPatientsBatch = async (patientsData) => {
  if (!patientsData || patientsData.length === 0) {
    return [];
  }

  try {
    // Verificar qué pacientes ya existen
    const dnis = patientsData.map(p => p.dni);
    const { data: existingPatients } = await supabase
      .from('pacientes')
      .select('dni, id')
      .in('dni', dnis);

    const existingDnis = new Map();
    existingPatients?.forEach(p => {
      existingDnis.set(p.dni, p.id);
    });

    // Separar nuevos vs existentes
    const newPatients = patientsData.filter(p => !existingDnis.has(p.dni));
    const patientsToUpdate = patientsData.filter(p => existingDnis.has(p.dni));

    let insertedPatients = [];
    
    // ✅ INSERTAR NUEVOS PACIENTES CON TODOS LOS CAMPOS
    if (newPatients.length > 0) {
      const { data, error } = await supabase
        .from('pacientes')
        .insert(newPatients.map(p => ({
          dni: p.dni,
          nombres: p.nombres,
          edad: p.edad || null,
          historia_clinica: p.historia_clinica || null,
          telefono: p.telefono || null,
          direccion: p.direccion || null,
          distrito: p.distrito || null
        })))
        .select();

      if (error) throw error;
      insertedPatients.push(...data);
    }

    // ✅ ACTUALIZAR PACIENTES EXISTENTES CON DATOS FALTANTES
    for (const patient of patientsToUpdate) {
      const updates = {};
      if (patient.historia_clinica) updates.historia_clinica = patient.historia_clinica;
      if (patient.telefono) updates.telefono = patient.telefono;
      if (patient.direccion) updates.direccion = patient.direccion;
      if (patient.distrito) updates.distrito = patient.distrito;
      
      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('pacientes')
          .update(updates)
          .eq('dni', patient.dni)
          .select();
        
        if (!error && data) {
          insertedPatients.push(...data);
        }
      } else {
        insertedPatients.push({
          id: existingDnis.get(patient.dni),
          dni: patient.dni,
          nombres: patient.nombres
        });
      }
    }

    return insertedPatients;
  } catch (error) {
    console.error('Error en insertPatientsBatch:', error);
    throw error;
  }
};

const updatePatient = async (id, updateData) => {
  const { error } = await supabase
    .from('pacientes')
    .update(updateData)
    .eq('id', id);
  if (error) throw error;
  return { success: true };
};

module.exports = {
  insertPatientsBatch,
  updatePatient
};
```
---

# File: backend\services\userService.js
```js
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
  if (password) authUpdates.password=[HIDDEN]perfiles')
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
```
---

# File: backend\utils\excelHelpers.js
```js
// utils/excelHelpers.js

/**
 * Obtiene el primer valor no nulo/undefined de una lista de posibles nombres de columna.
 * @param {Object} row - Fila del Excel (objeto con columnas)
 * @param {Array<string>} possibleNames - Lista de nombres posibles (orden de preferencia)
 * @returns {any} - Valor encontrado o null
 */
const getColumn = (row, possibleNames) => {
  if (!row) return null;
  for (let name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null) {
      return row[name];
    }
  }
  return null;
};

/**
 * Detecta automáticamente el mapeo de columnas para una hoja dada,
 * basado en las columnas presentes.
 * @param {Object} rowSample - Una fila de muestra (primera fila con datos)
 * @param {string} sheetName - Nombre de la hoja (por si se requiere un caso especial)
 * @returns {Object} Mapeo de nombres de campos a lista de posibles nombres de columnas
 */
const detectColumnMapping = (rowSample, sheetName) => {
  const columns = Object.keys(rowSample || {});
  
  // Mapeo base (compatible con ENE)
  const mapping = {
    dni: ['DNI', 'DNI '],
    nombres: ['APELLIDOS Y NOMBRES', 'APELLIDOS Y NOMBRES '],
    edad: ['EDAD'],
    hcl: ['HCL', 'H. CL.', 'H.CL'],
    telefono: ['TELEFONO ', 'TELEFONO 1', 'TELEFONO'],
    direccion: ['DIRECCION', 'DIRECCIÓN'],
    distrito: ['DISTRITO'],
    establecimiento: ['EE SS ORIGEN', 'EE SS ORIGEN '],
    fecha_toma_mx: ['TOMA DE MX', 'TOMA DE MAMOGRAFIA', 'TOMA DE MX '],
    resultados: ['RESULTADOS'],
    birads_mx: ['BI- RADS', 'BI-RADS'],
    sugerencia: ['SUGERENCIA'],
    fecha_recepcion: ['FECHA DE RECEPCION DE RESULTADOS'],
    fecha_recojo: ['FECHA DE RECOJO DE RESULTADOS POR EESS', 'FECHA DE RECOJO'],
    fecha_entrega: ['FECHA DE ENTREGA DE RESULTADOS A PCT'],
    cita_ecografia: ['CITA ECOGRAFIA'],
    resultados_ecografia: ['RESULTADOS DE ECOGRAFIA'],
    birads_ecografia: ['BI-RADS', 'BI-RADS_1'],
    sugerencias_ecografia: ['SUGERENCIAS'],
    fecha_toma_magnificacion: ['FECHA TOMA DE MAGNIFICACION', 'FECHA TOMA MAGNIFICAION'],
    resultados_magnificacion: ['RESULTADOS DE MAGNIFICACION'],
    birads_magnificacion: ['BI-RADS_1', 'BI-RADS_2'],
    sugerencias_magnificacion: ['SUGERENCIAS_1', 'SUGERENCIAS_2'],
    fecha_referencia_hrh: ['FECHA DE REFERENCIA AL H.R.H'],
    procedimiento_fecha: ['PROCEDIMIENTO (FECHA)'],
    tratamiento: ['TRATAMIENTO (FECHA)'],
    tratamiento_otra: ['TRATAMIENTO EN OTRA INSTITUCION'],
    referencia_otra: ['REFERENCIA A OTRA INSTITUCIÓN (FECHA)'],
    situacion_actual: ['SITUACIÓN ACTUAL']
  };

  // Ajustes específicos por hoja
  if (sheetName === 'MAY') {
    mapping.fecha_toma_mx = ['TOMA DE MAMOGRAFIA', 'TOMA DE MX'];
    mapping.birads_mx = ['BI-RADS'];  // En MAY el primer BI-RADS es de mamografía
    mapping.birads_ecografia = ['BI-RADS_1', 'BI-RADS'];  // El segundo es ecografía
    mapping.hcl = ['H. CL.', 'HCL'];  // En MAY se llama 'H. CL.'
  }
  
  if (sheetName === 'ABR') {
    // ABR tiene una columna extra 'VERIFICACIÓN', pero no afecta
  }

  // Para hojas simples (JUN, JUL, etc.) no es necesario cambiar mapping,
  // ya que getColumn retornará null para campos que no existan.

  return mapping;
};

/**
 * Obtiene el valor de un campo usando el mapping detectado.
 * @param {Object} row - Fila
 * @param {Object} mapping - Mapeo de campos a lista de nombres posibles
 * @param {string} field - Nombre del campo
 * @returns {any}
 */
const getField = (row, mapping, field) => {
  const possibleNames = mapping[field];
  if (!possibleNames) return null;
  return getColumn(row, possibleNames);
};

module.exports = {
  getColumn,
  detectColumnMapping,
  getField
};
```
---

# File: backend\utils\logger.js
```js
const fs = require('fs');

const logError = ({
  file,
  sheet,
  row,
  message
}) => {

  const log = `
[${new Date().toISOString()}]
Archivo: ${file}
Hoja: ${sheet}
Fila: ${row}
Error: ${message}

`;

  fs.appendFile(
    './logs/errors.log',
    log,
    (error) => {

      if (error) {
        console.error(error);
      }

    }
  );

};
const logSuccess = (message) => {

  fs.appendFile(
    './logs/success.log',
    `${new Date().toISOString()} - ${message}\n`,
    () => {}
  );

};
module.exports = {
  logError,
  logSuccess
};
```
---

# File: backend\utils\normalize.js
```js
const normalizeText = (text) => {
  if (!text) return null;

  return text
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeDni = (dni) => {
  if (!dni) return null;

  let dniStr = dni
    .toString()
    .trim()
    .replace('.0', '')
    .replace(/\./g, '');

  // Reemplazar letras O, o, I, i por números
  dniStr = dniStr.replace(/O/g, '0');
  dniStr = dniStr.replace(/o/g, '0');
  dniStr = dniStr.replace(/I/g, '1');
  dniStr = dniStr.replace(/i/g, '1');
  
  // Eliminar cualquier carácter no numérico
  dniStr = dniStr.replace(/[^0-9]/g, '');
  
  // Si tiene más de 8 dígitos, tomar los últimos 8
  if (dniStr.length > 8) {
    dniStr = dniStr.slice(-8);
  }
  
  // Si tiene 7 dígitos, agregar un cero al inicio
  if (dniStr.length === 7) {
    dniStr = '0' + dniStr;
  }
  
  // Si tiene menos de 7 dígitos (ej. 6), agregar dos ceros? No, es muy riesgoso. Mejor retornar null.
  if (dniStr.length !== 8) {
    return null;
  }
  
  return dniStr;
};
const normalizeDate = (value) => {
  if (!value) return null;
  
  // Si es un número, asumir timestamp (segundos o milisegundos)
  if (typeof value === 'number') {
    // Si es un timestamp de Excel (días desde 1900), convertirlo
    if (value > 40000 && value < 60000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
    return null;
  }
  
  // Si es string, intentar parsear
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Si el string contiene letras (como "BIOPSIA", "MASTECTOMÍA", "QUIMIOTERAPIA") -> null
    if (/[a-zA-Z]/i.test(trimmed) && !/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed) && !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return null;
    }
    
    // Formato "dd/mm/yyyy"
    if (trimmed.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = trimmed.split('/');
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return date;
      }
      return null;
    }
    
    // Formato "yyyy-mm-dd" o "yyyy-mm-dd HH:MM:SS"
    const date = new Date(trimmed);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date;
    }
    
    // Formato "ene-26" (mes abreviado)
    const monthNames = { 'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12' };
    const match = trimmed.toLowerCase().match(/^([a-z]{3})-(\d{2})$/);
    if (match) {
      const month = monthNames[match[1]];
      if (month) {
        const year = `20${match[2]}`;
        return new Date(`${year}-${month}-01`);
      }
    }
  }
  
  // Último intento con Date nativo
  const date = new Date(value);
  if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
    return date;
  }
  
  return null;
};

// ✅ AGREGAR ESTA NUEVA FUNCIÓN
const normalizePhone = (phone) => {
  if (!phone) return null;
  
  return phone
    .toString()
    .trim()
    .replace(/\s+/g, '')      // Eliminar espacios
    .replace(/-/g, '')         // Eliminar guiones
    .replace(/\(/g, '')        // Eliminar paréntesis
    .replace(/\)/g, '')        // Eliminar paréntesis
    .replace(/\./g, '');       // Eliminar puntos
};


module.exports = {
  normalizeText,
  normalizeDni,
  normalizeDate,
  normalizePhone
};
```
---

# File: backend\utils\validators.js
```js
const isValidDni = (dni) => {
  if (!dni) return false;
  const dniStr = dni.toString();
  // DNI peruano debe tener exactamente 8 dígitos numéricos
  return /^\d{8}$/.test(dniStr);
};

const INVALID_NAMES = [
  'TOTAL',
  'PACIENTES',
  'ENERO',
  'FEBRERO',
  'MARZO'
];

const isValidName = (name) => {

  if (!name) return false;

  const cleanName = name
    .toString()
    .trim()
    .toUpperCase();

  if (cleanName.length < 5) {
    return false;
  }

  return !INVALID_NAMES.some(
    invalid => cleanName.includes(invalid)
  );

};
const isValidDate = (value) => {

  if (!value) return false;

  const date = new Date(value);

  return !isNaN(date.getTime());

};
const isValidAge = (age) => {

  if (!age) return false;

  const parsedAge = Number(age);

  return parsedAge >= 0 && parsedAge <= 120;

};
module.exports = {
  isValidDni,
  isValidName,
  isValidDate,
  isValidAge
};
```
---

# File: frontend\src\App.css
```css
/* Archivo vacío para evitar conflictos con Tailwind CSS */
body {
    font-family: 'Inter', sans-serif;
}
```
---

# File: frontend\src\App.tsx
```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import MammographyList from './pages/MammographyList';
import Dashboard from './pages/Dashboard';
import Metas from './pages/Metas';
import UserList from './pages/UserList';
import Settings from './pages/Settings';
import PositiveCases from './pages/PositiveCases';
import Sidebar from './components/Sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useTheme } from './contexts/ThemeContext';

function PrivateRoute({ children }) {
  const { session, loading, user, signOut } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Cargando...</p>
      </div>
    </div>
  );

  if (!session) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Sidebar {...{ user, onLogout: signOut } as any} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function App() {
  const { toastPosition, toastDuration } = useTheme();
  console.log(toastPosition, toastDuration);
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/mamografias"
          element={
            <PrivateRoute>
              <MammographyList />
            </PrivateRoute>
          }
        />
        <Route
          path="/metas"
          element={
            <PrivateRoute>
              <Metas />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <PrivateRoute>
              <UserList />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/casos-positivos"
          element={
            <PrivateRoute>
              <PositiveCases />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster
        position={toastPosition as any}
        toastOptions={{
          duration: toastDuration,
          style: {
            background: '#0f172a', // slate-900
            color: '#fff',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AnimatePresence>
  );
}

export default App;
```
---

# File: frontend\src\index.css
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", "system-ui", "sans-serif";
  --color-accent: var(--accent-primary);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
}

@layer base {
  :root[data-accent="indigo"] {
    --accent-primary: #4f46e5;
    --accent-hover: #4338ca;
    --accent-soft: rgba(79, 70, 229, 0.1);
    --accent-shadow: rgba(79, 70, 229, 0.2);
  }
  :root[data-accent="emerald"] {
    --accent-primary: #059669;
    --accent-hover: #047857;
    --accent-soft: rgba(5, 150, 105, 0.1);
    --accent-shadow: rgba(5, 150, 105, 0.2);
  }
  :root[data-accent="rose"] {
    --accent-primary: #e11d48;
    --accent-hover: #be123c;
    --accent-soft: rgba(225, 29, 72, 0.1);
    --accent-shadow: rgba(225, 29, 72, 0.2);
  }

  :root[data-accent="blue"] {
    --accent-primary: #3b82f6;
    --accent-hover: #2563eb;
    --accent-soft: rgba(59, 130, 246, 0.1);
    --accent-shadow: rgba(59, 130, 246, 0.2);
  }

  :root[data-accent="sky"] {
    --accent-primary: #0ea5e9;
    --accent-hover: #0284c7;
    --accent-soft: rgba(14, 165, 233, 0.1);
    --accent-shadow: rgba(14, 165, 233, 0.2);
  }

  :root[data-accent="purple"] {
    --accent-primary: #7c3aed;
    --accent-hover: #6d28d9;
    --accent-soft: rgba(124, 58, 237, 0.1);
    --accent-shadow: rgba(124, 58, 237, 0.2);
  }

  :root[data-accent="pink"] {
    --accent-primary: #ec4899;
    --accent-hover: #db2777;
    --accent-soft: rgba(236, 72, 153, 0.1);
    --accent-shadow: rgba(236, 72, 153, 0.2);
  }

  :root[data-accent="teal"] {
    --accent-primary: #0d9488;
    --accent-hover: #0f766e;
    --accent-soft: rgba(13, 148, 136, 0.1);
    --accent-shadow: rgba(13, 148, 136, 0.2);
  }

  :root[data-accent="lime"] {
    --accent-primary: #84cc16;
    --accent-hover: #65a30d;
    --accent-soft: rgba(132, 204, 22, 0.1);
    --accent-shadow: rgba(132, 204, 22, 0.2);
  }

  :root[data-accent="amber"] {
    --accent-primary: #f59e0b;
    --accent-hover: #d97706;
    --accent-soft: rgba(245, 158, 11, 0.1);
    --accent-shadow: rgba(245, 158, 11, 0.2);
  }

  .bg-accent { background-color: var(--accent-primary) !important; }
  .bg-accent-hover:hover { background-color: var(--accent-hover) !important; }
  .text-accent { color: var(--accent-primary) !important; }
  .border-accent { border-color: var(--accent-primary) !important; }
  .ring-accent { --tw-ring-color: var(--accent-primary) !important; }
  .shadow-accent { --tw-shadow-color: var(--accent-shadow) !important; }
  .bg-accent-soft { background-color: var(--accent-soft) !important; }

  html, body {
    @apply m-0 p-0 bg-slate-50 text-slate-900 antialiased min-h-screen w-full;
    @apply dark:bg-slate-900 dark:text-slate-100;
    font-family: var(--font-sans);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  #root {
    @apply min-h-screen w-full m-0 p-0 text-left;
    max-width: none;
    border: none;
  }
}

/* Scrollbar premium */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full hover:bg-slate-300;
}
.dark ::-webkit-scrollbar-thumb {
  @apply bg-slate-600 hover:bg-slate-500;
}

```
---

# File: frontend\src\main.tsx
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```
---

# File: frontend\src\vite-env.d.ts
```typescript
/// <reference types="vite/client" />

```
---

# File: frontend\src\components\AllEstablishmentsModal.tsx
```typescript
import { useState } from 'react';
import { 
  Building2, 
  X, 
  Search 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProgressColor, getProgressTextColor } from '../utils/colors';

const AllEstablishmentsModal = ({ isOpen, onClose, establishments, totalAtenciones }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrar y ordenar: Primero por cantidad, luego alfabéticamente
  const establishmentsArray = Array.isArray(establishments) ? establishments : [];
  
  const filtered = establishmentsArray
    .filter(e => 
      e && e.nombre && e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (b.cantidad !== a.cantidad) {
        return b.cantidad - a.cantidad;
      }
      return a.nombre.localeCompare(b.nombre);
    });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 size={20} className="text-accent" />
                  Productividad por Establecimiento
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Listado completo de avances vs metas anuales</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar establecimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {filtered.map((est, idx) => {
                  const hasMeta = est.meta > 0;
                  const percentage = hasMeta ? Math.min((est.cantidad / est.meta) * 100, 100) : (est.cantidad / totalAtenciones) * 100;
                  const progressColor = hasMeta ? getProgressColor(percentage) : 'bg-slate-400';
                  const progressTextColor = hasMeta ? getProgressTextColor(percentage) : 'text-slate-400';
                  
                  return (
                    <div key=[HIDDEN]relative group">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {est.nombre}
                          </span>
                          {hasMeta && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Meta: {est.meta}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                            {est.cantidad}
                          </span>
                          {hasMeta && (
                            <span className={`text-[10px] font-bold ${progressTextColor}`}>
                              {percentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`${progressColor} h-full rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No se encontraron establecimientos con ese nombre.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AllEstablishmentsModal;

```
---

# File: frontend\src\components\MammographyModal.tsx
```typescript
// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Calendar, MapPin, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { mammographyApi } from '../../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useMutateMammography } from '../hooks/queries/useMammographies';
import { useEstablecimientos } from '../hooks/queries/useEstablishments';

export default function MammographyModal({ isOpen, onClose, mammographyId, onSuccess }) {
  const { isAdmin, perfil } = useAuth();
  const [initialLoading, setInitialLoading] = useState(false);
  const { data: establecimientos = [] } = useEstablecimientos();
  const { mutateAsync: saveMammography, isPending: loading } = useMutateMammography();
  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    fecha: new Date().toISOString().split('T')[0],
    establecimiento_id: '',
    birads: '',
    resultados_mx: '',
    sugerencia_mx: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (mammographyId) {
        fetchMammography();
      } else {
        setFormData({
          dni: '',
          nombres: '',
          fecha: new Date().toISOString().split('T')[0],
          establecimiento_id: (!isAdmin && perfil?.establecimiento_id) ? perfil.establecimiento_id : '',
          birads: '',
          resultados_mx: '',
          sugerencia_mx: '',
        });
      }
    }
  }, [isOpen, mammographyId, isAdmin, perfil]);


  const fetchMammography = async () => {
    setInitialLoading(true);
    try {
      const res = await mammographyApi.getById(mammographyId);
      const m = res.data;
      
      // Intentar extraer el número de BI-RADS si birads_mx tiene formato "BI-RADS 4"
      let biradsValue = m.birads || '';
      if (!biradsValue && m.birads_mx) {
        const match = m.birads_mx.match(/BI-RADS\s*(.+)/i);
        biradsValue = match ? match[1].trim() : m.birads_mx;
      }

      setFormData({
        dni: m.atencion?.paciente?.dni || '',
        nombres: m.atencion?.paciente?.nombres || '',
        fecha: m.atencion?.fecha || '',
        establecimiento_id: m.atencion?.establecimiento_id || '',
        birads: biradsValue,
        resultados_mx: m.resultados_mx || '',
        sugerencia_mx: m.sugerencia_mx || '',
      });
    } catch (err) {
      console.error('Error al cargar detalle:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveMammography({ id: mammographyId, data: formData });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al guardar los datos');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {initialLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-accent" size={48} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando datos...</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 dark:bg-slate-700/50 px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                      {mammographyId ? 'Editar Atención' : 'Nueva Atención'}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                      Registro de Tamizaje Oncológico
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Paciente Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-accent mb-2">
                        <User size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Información del Paciente</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Documento</label>
                        <input
                          type="text"
                          required
                          value={formData.dni}
                          onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombres Completos</label>
                        <input
                          type="text"
                          required
                          value={formData.nombres}
                          onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Atención Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <Calendar size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Detalle de Atención</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha}
                          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Establecimiento</label>
                        <select
                          required
                          value={formData.establecimiento_id}
                          onChange={(e) => setFormData({ ...formData, establecimiento_id: e.target.value })}
                          disabled={!isAdmin}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <option value="">Seleccionar...</option>
                          {establecimientos.map(est => (
                            <option key=[HIDDEN]pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <Activity size={18} />
                      <span className="text-xs font-black uppercase tracking-widest">Resultado de Mamografía</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría BI-RADS</label>
                        <select
                          required
                          value={formData.birads}
                          onChange={(e) => setFormData({ ...formData, birads: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        >
                          <option value="">BI-RADS...</option>
                          {['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'].map(v => (
                            <option key=[HIDDEN]md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hallazgos / Resultados</label>
                        <input
                          type="text"
                          value={formData.resultados_mx}
                          onChange={(e) => setFormData({ ...formData, resultados_mx: e.target.value })}
                          placeholder="Descripción breve..."
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sugerencias Médicas</label>
                      <textarea
                        value={formData.sugerencia_mx}
                        onChange={(e) => setFormData({ ...formData, sugerencia_mx: e.target.value })}
                        rows="2"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-accent dark:shadow-accent/40 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {mammographyId ? 'GUARDAR CAMBIOS' : 'REGISTRAR ATENCIÓN'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```
---

# File: frontend\src\components\Navbar.tsx
```typescript
import { Link } from 'react-router-dom';

export default function Navbar({ onLogout }) {
  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0f0f0' }}>
      <Link to="/">Mamografías</Link>
      <button onClick={onLogout}>Cerrar sesión</button>
    </nav>
  );
}
```
---

# File: frontend\src\components\PatientHistoryModal.tsx
```typescript
import { usePatientHistory } from '../hooks/queries/usePatients';
import {
  X,
  User,
  Calendar,
  FileText,
  Activity,
  Building2,
  MapPin,
  Phone,
  Clock,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getBiradsStyle = (birads) => {
  if (!birads) return 'bg-slate-100 text-slate-500';
  const b = birads.toUpperCase();
  if (b.includes('4') || b.includes('5') || b.includes('6')) return 'bg-rose-100 text-rose-600 border-rose-200';
  if (b.includes('3')) return 'bg-amber-100 text-amber-600 border-amber-200';
  return 'bg-emerald-100 text-emerald-600 border-emerald-200';
};

export default function PatientHistoryModal({ dni, isOpen, onClose }) {
  const { data, isLoading: loading, error } = usePatientHistory(isOpen ? dni : null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
              <History className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                Historial Clínico
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest">
                DNI: {dni}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 font-bold">Cargando historial...</p>
            </div>
          ) : error || !data ? (
            <div className="text-center py-20">
              <p className="text-rose-500 font-bold">
                {error ? 'No se pudo cargar el historial de la paciente.' : 'No se encontró historial para el DNI especificado.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Info Paciente */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <User size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white uppercase">{data.paciente.nombres}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edad</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">{data.paciente.edad} años</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">{data.paciente.telefono || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:col-span-2">
                  <MapPin size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección / Distrito</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white uppercase">
                      {data.paciente.direccion || '—'} {data.paciente.distrito ? `(${data.paciente.distrito})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">H.C.</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">{data.paciente.historia_clinica || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Timeline de Mamografías */}
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock size={20} className="text-indigo-500" />
                  Línea de Tiempo de Atenciones
                </h3>

                <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-4 pl-8 space-y-8">
                  {data.historial.length === 0 ? (
                    <p className="text-slate-400 font-bold italic py-4">No hay atenciones previas registradas.</p>
                  ) : (
                    data.historial.map((h, idx) => (
                      <div key=[HIDDEN]relative">
                        {/* Dot */}
                        <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-4 border-indigo-500 shadow-sm" />

                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-black text-slate-800 dark:text-white">
                                {new Date(h.atencion.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBiradsStyle(h.birads_mx)}`}>
                                {h.birads_mx || 'BI-RADS ?'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-bold bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl">
                              <Building2 size={14} />
                              {h.atencion.establecimiento?.nombre || 'Sede desconocida'}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado Mastología / Mamografía</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                {h.resultados_mx || 'Sin detalle de resultado'}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugerencia</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium italic">
                                "{h.sugerencia_mx || 'Sin sugerencia registrada'}"
                              </p>
                            </div>
                          </div>

                          {(h.atencion.observaciones) && (
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones Generales</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {h.atencion.observaciones}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-800/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            ONCO - SISTEM © 2026 — Seguimiento Oncológico
          </p>
        </div>
      </motion.div>
    </div>
  );
}
```
---

# File: frontend\src\components\Sidebar.tsx
```typescript
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Settings,
  Users,
  User,
  Activity,
  ChevronRight,
  AlertTriangle,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar({ onLogout }) {
  const { user, perfil, isAdmin } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: ClipboardList, label: "Mamografías", path: "/mamografias" },
    { icon: AlertTriangle, label: "Casos Positivos", path: "/casos-positivos" },
    { icon: Target, label: "Metas", path: "/metas" },
    ...(isAdmin ? [{ icon: Users, label: "Usuarios", path: "/usuarios" }] : []),
    { icon: Settings, label: "Configuración", path: "/configuracion" },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-2 rounded-4xl border-slate-100 dark:border-slate-700 flex flex-col h-206.75   sticky left-3 top-3 z-50 transition-colors duration-300">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-2.5 rounded-2xl shadow-lg shadow-accent">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-md tracking-tight text-slate-800 dark:text-white leading-none">
              ONCO - SISTEM
            </h1>
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
              Prevención Cáncer
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-2 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key=[HIDDEN]bg-accent text-white shadow-xl shadow-accent font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-accent"
              }
            `}
          >
            <div className="flex items-center gap-4">
              <item.icon
                size={20}
                className="transition-transform group-hover:scale-110"
              />
              <span className="text-sm tracking-tight">{item.label}</span>
            </div>
            <ChevronRight
              size={16}
              className={`opacity-0 group-hover:opacity-100 transition-all ${item.path === window.location.pathname ? "hidden" : ""}`}
            />
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-slate-600 p-2 rounded-2xl shadow-sm text-accent shrink-0">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-800 dark:text-white truncate uppercase">
                {perfil?.nombres || user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                {perfil?.rol || "Usuario"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all font-bold text-sm group"
        >
          <LogOut
            size={18}
            className="transition-transform group-hover:-translate-x-1"
          />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

```
---

# File: frontend\src\components\UserModal.tsx
```typescript
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Mail, Shield, MapPin, Loader2, Lock } from 'lucide-react';
import { userApi } from '../../services/api';
import { useMutateUser } from '../hooks/queries/useUsers';
import { useEstablecimientos } from '../hooks/queries/useEstablishments';

export default function UserModal({ isOpen, onClose, userId, onSuccess }) {
  const [initialLoading, setInitialLoading] = useState(false);
  const { data: establecimientos = [] } = useEstablecimientos();
  const { mutateAsync: saveUser, isPending: loading } = useMutateUser();
  const [formData, setFormData] = useState({
    nombres: '',
    email: '',
    password: '',
    rol: 'establecimiento',
    establecimiento_id: '',
  });

  useEffect(() => {
    const loadAllData = async () => {
      if (!isOpen) return;

      try {
        // 2. Si hay ID, cargar usuario
        if (userId) {
          setInitialLoading(true);
          const userRes = await userApi.getById(userId);
          const u = userRes.data;
          console.log('DATOS CARGADOS EN MODAL:', u);
          
          if (u) {
            setFormData({
              nombres: u.nombres || '',
              email: u.email || '',
              password: '',
              rol: u.rol || 'establecimiento',
              establecimiento_id: u.establecimiento_id || '',
            });
          }
        } else {
          // Reset para nuevo usuario
          setFormData({
            nombres: '',
            email: '',
            password: '',
            rol: 'establecimiento',
            establecimiento_id: '',
          });
        }
      } catch (err) {
        console.error('Error al cargar datos en modal:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadAllData();
  }, [isOpen, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveUser({ id: userId, data: formData });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al guardar usuario');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {initialLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-accent" size={48} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando datos...</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 dark:bg-slate-700/50 px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                      {userId ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                      Control de Acceso al Sistema
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      <User size={12} /> Nombres Completos
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      <Mail size={12} /> Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>

                  {!userId && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Lock size={12} /> Contraseña
                      </label>
                      <input
                        type="password"
                        required={!userId}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Shield size={12} /> Rol
                      </label>
                      <select
                        required
                        value={formData.rol}
                        onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                      >
                        <option value="admin">Administrador</option>
                        <option value="microred">Microred</option>
                        <option value="establecimiento">Establecimiento</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <MapPin size={12} /> Sede
                      </label>
                      <select
                        value={formData.establecimiento_id}
                        onChange={(e) => setFormData({ ...formData, establecimiento_id: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                      >
                        <option value="">Acceso Global</option>
                        {establecimientos.map(est => (
                          <option key=[HIDDEN]pt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-accent dark:shadow-accent/40 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {userId ? 'GUARDAR' : 'CREAR'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

```
---

# File: frontend\src\contexts\AuthContext.tsx
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../services/supabase';
import axios from 'axios';
import { Perfil } from '../types';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: any;
  session: any;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<any>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isMicrored: boolean;
  isEstablecimiento: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const queryClient = useQueryClient();

  // Configurar el token de Axios para todas las peticiones al backend
  const setAuthToken=[HIDDEN]Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Obtener el perfil del usuario desde la tabla 'perfiles'
  const fetchPerfil = async (userId: string) => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('rol, nombres, establecimiento_id, microred_id')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
    return { ...data, id: userId };
  };

  // Iniciar sesión
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // data.session contiene el token
    setSession(data.session);
    setUser(data.user);
    setAuthToken(data.session.access_token);
    // Cargar perfil
    const perfilData = await fetchPerfil(data.user.id);
    setPerfil(perfilData);
    return data;
  };

  // Cerrar sesión
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPerfil(null);
    setAuthToken(null);
    queryClient.clear();
  };

  // Verificar la sesión al cargar la app
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthToken(session.access_token);
        const perfilData = await fetchPerfil(session.user.id);
        setPerfil(perfilData);
      }
      setLoading(false);
    };

    getSession();

    // Escuchar cambios en la autenticación
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthToken(session.access_token);
        fetchPerfil(session.user.id).then(setPerfil);
      } else {
        setAuthToken(null);
        setPerfil(null);
        queryClient.clear();
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    perfil,
    loading,
    signIn,
    signOut,
    isAdmin: perfil?.rol === 'admin',
    isMicrored: perfil?.rol === 'microred',
    isEstablecimiento: perfil?.rol === 'establecimiento',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```
---

# File: frontend\src\contexts\ThemeContext.tsx
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  mode: string;
  setMode: (m: string) => void;
  accent: string;
  setAccent: (a: string) => void;
  isDark: boolean;
  toastPosition: string;
  setToastPosition: (p: string) => void;
  toastDuration: number;
  setToastDuration: (d: number) => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState(() => localStorage.getItem('theme-mode') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('theme-accent') || 'indigo');
  const [toastPosition, setToastPosition] = useState(() => localStorage.getItem('toast-position') || 'top-right');
  const [toastDuration, setToastDuration] = useState(() => Number(localStorage.getItem('toast-duration')) || 3000);

  // Determinar si el modo oscuro está activo
  const isDark = mode === 'dark' || 
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Aplicar la clase 'dark' al <html> y persistir
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', mode);
  }, [mode, isDark]);

  // Persistir el color de acento
  useEffect(() => {
    localStorage.setItem('theme-accent', accent);
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  // Persistir configuración de toasts
  useEffect(() => {
    localStorage.setItem('toast-position', toastPosition);
  }, [toastPosition]);

  useEffect(() => {
    localStorage.setItem('toast-duration', toastDuration.toString());
  }, [toastDuration]);

  // Escuchar cambios en las preferencias del sistema
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.classList.toggle('dark', media.matches);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ 
      mode, setMode, 
      accent, setAccent, 
      isDark,
      toastPosition, setToastPosition,
      toastDuration, setToastDuration
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

```
---

# File: frontend\src\pages\Dashboard.tsx
```typescript
// @ts-nocheck
import { useState } from "react";
import { useMammographyStats } from "../hooks/queries/useMammographies";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  ArcElement,
  Legend,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Users,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  Building2,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import AllEstablishmentsModal from "../components/AllEstablishmentsModal";
import { getProgressColor, getProgressTextColor } from "../utils/colors";
import toast from "react-hot-toast";
import { useEffect } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

const StatCard = ({ title, value, icon: Icon, color, percentage }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-start justify-between hover:shadow-md transition-all duration-300"
  >
    <div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
        {title}
      </p>
      <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">
        {value}
      </h3>
      {percentage && (
        <p className="text-xs mt-2 font-semibold text-rose-500 flex items-center gap-1">
          <TrendingUp size={12} /> {percentage}% del total
        </p>
      )}
    </div>
    <div className={`p-3 rounded-xl ${color} shadow-lg shadow-current/20`}>
      <Icon className="text-white" size={24} />
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { data: stats, isLoading: loading, error } = useMammographyStats();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (stats) {
      const totalMetas = stats.allEstablecimientos.reduce(
        (acc, est) => acc + (est.meta || 0),
        0,
      );
      const percentage =
        totalMetas > 0
          ? ((stats.totalAtenciones / totalMetas) * 100).toFixed(1)
          : 0;

      toast(
        `Progreso General: ${stats.totalAtenciones} atendidos de una meta total de ${totalMetas} (${percentage}%)`,
        {
          icon: "📊",
          duration: 5000,
          style: {
            background: isDark
              ? "rgba(15, 23, 42, 0.7)"
              : "rgba(255, 255, 255, 0.7)",
            color: isDark ? "#ffffff" : "#1f2937",
          },
        },
      );
    }
  }, [!!stats]);

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Cargando estadísticas...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle /> Error al cargar estadísticas
        </div>
      </div>
    );

  const gridColor = isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.05)";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  const monthlyData = {
    labels: stats.atencionesPorMes.map((d) => d.mes),
    datasets: [
      {
        label: "Atenciones",
        data: stats.atencionesPorMes.map((d) => d.cantidad),
        borderColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--accent-primary"),
        backgroundColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--accent-soft"),
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--accent-primary"),
      },
    ],
  };

  const biradsData = {
    labels: Object.keys(stats.distribucionBirads),
    datasets: [
      {
        data: Object.values(stats.distribucionBirads),
        backgroundColor: [
          "#94a3b8",
          "#10b981",
          "#f59e0b",
          "#f97316",
          "#ef4444",
          "#881337",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor },
      },
      x: { grid: { display: false }, ticks: { color: textColor } },
    },
    metrics: [
      {
        title: "Exámenes Semanales",
        value: stats?.semanal || 0,
        icon: CalendarDays,
        color: "bg-emerald-500",
        percentage: 0,
      },
      {
        title: "Exámenes Mensuales",
        value: stats?.mensual || 0,
        icon: CalendarDays,
        color: "bg-blue-500",
        percentage: 0,
      },
    ],
  };

  return (
    <div className="space-y-8 p-6  max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Panel de Control
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Resumen general del sistema de tamizaje oncológico
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
          <CheckCircle2 size={14} /> Sistema en línea
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Atenciones Totales"
          value={stats.totalAtenciones}
          icon={ClipboardList}
          color="bg-accent"
        />
        <StatCard
          title="Pacientes Únicos"
          value={stats.totalPacientes}
          icon={Users}
          color="bg-emerald-600"
        />
        <StatCard
          title="Resultados Positivos"
          value={stats.totalPositivas}
          percentage={stats.porcentajePositivas}
          icon={AlertCircle}
          color="bg-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico Tendencia */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-8">
            <TrendingUp size={18} className="text-accent" />
            Tendencia de Atenciones
          </h3>
          <div className="h-[300px]">
            <Line data={monthlyData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico BI-RADS */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-8">
            <AlertCircle size={18} className="text-rose-600" />
            Distribución BI-RADS
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut
              data={biradsData}
              options={{
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      color: textColor,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Establecimientos */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2
              size={18}
              className="text-slate-500 dark:text-slate-400"
            />
            Productividad vs Metas (Top 5)
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-accent hover:text-accent-hover text-sm font-bold flex items-center gap-1 transition-colors px-4 py-2 rounded-xl hover:bg-accent/5"
          >
            Ver más <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {stats.topEstablecimientos.map((est, idx) => {
            const hasMeta = est.meta > 0;
            const percentage = hasMeta
              ? Math.min((est.cantidad / est.meta) * 100, 100)
              : (est.cantidad / stats.totalAtenciones) * 100;
            const progressColor = hasMeta
              ? getProgressColor(percentage)
              : "bg-slate-400";
            const progressTextColor = hasMeta
              ? getProgressTextColor(percentage)
              : "text-slate-400";

            return (
              <div key=[HIDDEN]relative group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-accent transition-colors">
                      {est.nombre}
                    </span>
                    {hasMeta && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Meta: {est.meta} tamizajes
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                      {est.cantidad}
                    </span>
                    {hasMeta && (
                      <span
                        className={`text-[10px] font-bold ${progressTextColor}`}
                      >
                        {percentage.toFixed(1)}% de la meta
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-600/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      duration: 1.2,
                      ease: "easeOut",
                      delay: idx * 0.1,
                    }}
                    className={`${progressColor} h-full rounded-full shadow-sm relative`}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AllEstablishmentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        establishments={stats.allEstablecimientos}
        totalAtenciones={stats.totalAtenciones}
      />
    </div>
  );
}

```
---

# File: frontend\src\pages\Login.tsx
```typescript
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Activity } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError('Credenciales inválidas o error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 selection:bg-accent-soft selection:text-accent transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="p-10 sm:p-12">
            <div className="flex justify-center mb-10">
              <div className="bg-accent p-5 rounded-[2rem] shadow-xl shadow-accent/20 transform -rotate-6">
                <Activity className="text-white" size={36} />
              </div>
            </div>

            <h2 className="text-4xl font-black text-center text-slate-800 dark:text-white tracking-tighter">
              ONCO - SISTEM
            </h2>
            <p className="text-center text-slate-400 dark:text-slate-500 mt-3 font-bold uppercase text-[10px] tracking-[0.2em]">
              Gestión de Tamizaje Oncológico
            </p>

            <form onSubmit={handleSubmit} className="mt-12 space-y-7">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Corporativo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-accent transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-[1.5rem] text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-0 focus:border-accent focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    placeholder="admin@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-accent transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent rounded-[1.5rem] text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-0 focus:border-accent focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm"
                >
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 dark:bg-accent hover:bg-accent dark:hover:bg-accent-hover text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 dark:shadow-accent/20 hover:shadow-accent/20 transform transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    AUTENTICANDO...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    INICIAR SESIÓN
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4">
            <span className="h-px w-8 bg-slate-200 dark:bg-slate-700"></span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] font-black">
              Seguridad V.2.0
            </p>
            <span className="h-px w-8 bg-slate-200 dark:bg-slate-700"></span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```
---

# File: frontend\src\pages\MammographyList.tsx
```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Activity,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Building2,
  X,
  Download,
  History
} from 'lucide-react';
import { mammographyApi, establishmentApi } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import MammographyModal from '../components/MammographyModal';
import PatientHistoryModal from '../components/PatientHistoryModal';
import { Mamografia } from '../types';
import { useMammographiesList, useMutateMammography } from '../hooks/queries/useMammographies';
import { useEstablecimientos } from '../hooks/queries/useEstablishments';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import toast from 'react-hot-toast';

export default function MammographyList() {
  const { isAdmin, perfil } = useAuth();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterBirads, setFilterBirads] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');

  // Historial Paciente
  const [historyDni, setHistoryDni] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { data: establecimientos = [] } = useEstablecimientos();

  // Establecer filtro inicial si no es admin
  useEffect(() => {
    if (!isAdmin && perfil?.establecimiento_id) {
      setFilterEstablecimiento(perfil.establecimiento_id);
    }
  }, [isAdmin, perfil]);

  // Lógica de Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const apiFilters = useMemo(() => {
    const filters: any = {};
    if (debouncedSearch) filters.dni = debouncedSearch;
    if (filterBirads) filters.birads_mx = filterBirads;
    if (filterEstablecimiento) filters.establecimiento_id = filterEstablecimiento;
    return filters;
  }, [debouncedSearch, filterBirads, filterEstablecimiento]);

  const { data, isLoading: loading } = useMammographiesList(page, 10, apiFilters);
  const mammographies = data?.data || [];
  const total = data?.total || 0;

  const queryClient = useQueryClient();

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      await mammographyApi.delete(id);
      toast.success('Registro eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['mammographies'] });
      queryClient.invalidateQueries({ queryKey: ['mammographyStats'] });
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('No se pudo eliminar el registro');
    }
  };

  const totalPages = Math.ceil(total / 10);

  const handleExport = async () => {
    try {
      const filters: any = {};
      if (debouncedSearch) filters.dni = debouncedSearch;
      if (filterBirads) filters.birads_mx = filterBirads;
      if (filterEstablecimiento) filters.establecimiento_id = filterEstablecimiento;

      const res = await mammographyApi.export(filters);
      const data: Mamografia[] = res.data;

      const headers = ['DNI', 'Paciente', 'Fecha', 'BI-RADS', 'Establecimiento', 'Resultado', 'Sugerencia'];
      const rows = data.map((m: Mamografia) => [
        m.atencion?.paciente?.dni,
        m.atencion?.paciente?.nombres,
        m.atencion?.fecha,
        m.birads_mx,
        m.atencion?.establecimiento?.nombre,
        m.resultados_mx?.replace(/,/g, ';'),
        m.sugerencia_mx?.replace(/,/g, ';')
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `reporte_mamografias_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exportación generada con éxito');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('No se pudo generar la exportación');
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Registro de Mamografías</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoreo y gestión de pacientes tamizados en el sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3.5 rounded-2xl font-bold shadow-sm transition-all active:scale-95"
          >
            <Download size={20} />
            Exportar
          </button>
          <button
            onClick={() => {
              setSelectedId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-accent transition-all active:scale-95"
          >
            <Plus size={20} />
            Nueva Atención
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por DNI o Nombre de paciente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterBirads}
              onChange={(e) => { setFilterBirads(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Cualquier BI-RADS</option>
              {['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'].map(v => (
                <option key=[HIDDEN]md:col-span-3 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterEstablecimiento}
              onChange={(e) => { setFilterEstablecimiento(e.target.value); setPage(1); }}
              disabled={!isAdmin}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="">{isAdmin ? 'Todas las Sedes' : 'Mi Sede'}</option>
              {establecimientos.map(est => (
                <option key=[HIDDEN]md:col-span-1">
            <button
              onClick={() => {
                setSearch('');
                setFilterBirads('');
                if (isAdmin) setFilterEstablecimiento('');
                setPage(1);
              }}
              title="Limpiar filtros"
              className="w-full h-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Información Paciente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Fecha Atención</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resultado BI-RADS</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Establecimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key=[HIDDEN]animate-pulse">
                      <td className="px-8 py-8" colSpan={5}>
                        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  mammographies.map((m: Mamografia) => (
                    <motion.tr
                      key=[HIDDEN]hover:bg-accent-soft/30 dark:hover:bg-accent-soft/10 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl group-hover:bg-accent-soft dark:group-hover:bg-accent-soft/30 transition-colors">
                            <User className="text-slate-500 group-hover:text-accent" size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-white">{m.atencion?.paciente?.nombres || 'S/N'}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{m.atencion?.paciente?.dni || 'Sin DNI'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                          <Calendar size={14} className="text-slate-300" />
                          {m.atencion?.fecha}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {(() => {
                          const raw = (m.birads_mx || '').trim();
                          const match = raw.match(/BI-RADS\s*(.+)/i);
                          const label = match ? match[1].trim() : (raw || 'S/N');
                          const isPositive = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i.test(raw);
                          return (
                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${isPositive
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                              <Activity size={12} />
                              BI-RADS {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-bold truncate max-w-[250px]">
                        {m.atencion?.establecimiento?.nombre || 'Establecimiento no registrado'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const cleanDni = m.atencion?.paciente?.dni?.toString().trim();
                              console.log('Abriendo historial para DNI:', cleanDni);
                              setHistoryDni(cleanDni);
                              setIsHistoryOpen(true);
                            }}
                            title="Ver Historial"
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <History size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedId(m.id);
                              setIsModalOpen(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-accent hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <Edit size={18} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button className="p-2.5 text-slate-300 hover:text-slate-600">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest">
            ONCO - SISTEM <span className="mx-2">|</span> {total} REGISTROS ENCONTRADOS
          </span>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-2xl shadow-lg shadow-accent/20 text-white font-black text-sm">
              {page} <span className="opacity-50 text-[10px]">DE</span> {totalPages || 1}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <MammographyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mammographyId={selectedId}
        onSuccess={() => {
          // Ya se invalida en useMutateMammography, no hace falta recargar
        }}
      />

      <PatientHistoryModal
        dni={historyDni}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
```
---

# File: frontend\src\pages\Metas.tsx
```typescript
import { useState } from "react";
import { useMammographyStats } from "../hooks/queries/useMammographies";
import { useUpdateEstablishmentMeta } from "../hooks/queries/useEstablishmentMutations"; // Importar el nuevo hook de mutación
import {
  Target,
  Search,
  Filter,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  LayoutGrid,
  List,
  Pencil, // Importar el icono Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { getProgressColor, getProgressTextColor } from "../utils/colors";
import { useAuth } from "../contexts/AuthContext"; // Importar useAuth para permisos

export default function Metas() {
  const { isAdmin } = useAuth(); // Obtener isAdmin
  const { data: stats, isLoading: loading, error } = useMammographyStats();
  const establishments = stats?.allEstablecimientos || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMicrored, setSelectedMicrored] = useState("Todas");
  const [viewType, setViewType] = useState("grid"); // 'grid' or 'list'
  const { isDark } = useTheme();

  // Estado para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEstablishment, setEditingEstablishment] = useState<any | null>(
    null,
  );
  const [newMetaValue, setNewMetaValue] = useState<number | "">("");

  // Hook de mutación para actualizar meta
  const { mutate: updateMeta, isPending: isUpdatingMeta } =
    useUpdateEstablishmentMeta();

  const microredes = [
    "Todas",
    ...new Set(establishments.map((e) => e.microred).filter(Boolean)),
  ];

  const filtered = establishments
    .filter((e) => {
      const matchesSearch = e.nombre
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesMicrored =
        selectedMicrored === "Todas" || e.microred === selectedMicrored;
      return matchesSearch && matchesMicrored;
    })
    .sort((a, b) => b.cantidad - a.cantidad);

  const totalMetaGlobal = filtered.reduce((acc, curr) => acc + curr.meta, 0);
  const totalAtencionesGlobal = filtered.reduce(
    (acc, curr) => acc + curr.cantidad,
    0,
  );
  const globalPercentage =
    totalMetaGlobal > 0 ? (totalAtencionesGlobal / totalMetaGlobal) * 100 : 0;

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Cargando metas...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle /> Error al cargar las metas de los establecimientos
        </div>
      </div>
    );

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Target className="text-accent" size={32} />
            Metas y Avances
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Seguimiento de metas anuales por establecimiento
          </p>
        </div>

        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => setViewType("grid")}
            className={`p-2 rounded-lg transition-all ${viewType === "grid" ? "bg-accent text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewType("list")}
            className={`p-2 rounded-lg transition-all ${viewType === "list" ? "bg-accent text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
          >
            <List size={20} />
          </button>
        </div>
      </header>

      {/* Resumen Global */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-accent to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-accent/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div>
            <p className="text-white/80 font-medium mb-1">
              Avance Global Seleccionado
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black">
                {globalPercentage.toFixed(1)}%
              </h2>
              <span className="text-white/60 text-lg">de la meta</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span>{totalAtencionesGlobal.toLocaleString()} Atenciones</span>
              <span>Meta: {totalMetaGlobal.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(globalPercentage, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="bg-white h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>
          <div className="flex justify-end hidden md:flex">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <TrendingUp size={48} className="text-white/40" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar establecimiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all text-slate-700 dark:text-white shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <select
            value={selectedMicrored}
            onChange={(e) => setSelectedMicrored(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all text-slate-700 dark:text-white shadow-sm appearance-none cursor-pointer"
          >
            {microredes.map((m) => (
              <option key=[HIDDEN]absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={18}
          />
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 px-4 flex items-center justify-between shadow-sm">
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Resultados:
          </span>
          <span className="font-bold text-slate-800 dark:text-white">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Lista de Establecimientos */}
      <div className="min-h-[400px]">
        {viewType === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((est) => {
              const hasMeta = est.meta > 0;
              const percentage = hasMeta ? (est.cantidad / est.meta) * 100 : 0;
              const isCompleted = percentage >= 100;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  key=[HIDDEN]bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 group-hover:text-accent group-hover:bg-accent/5 transition-colors">
                      <Building2 size={24} />
                    </div>
                    {isCompleted && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-full">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingEstablishment(est);
                          setNewMetaValue(est.meta || "");
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-accent hover:bg-accent/5 transition-all ml-2"
                        title="Editar Meta"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-accent transition-colors">
                      {est.nombre}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                      {est.microred}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          Progreso
                        </p>
                        <p
                          className={`text-2xl font-black ${getProgressTextColor(percentage)}`}
                        >
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          Atenciones
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {est.cantidad}{" "}
                          <span className="text-slate-400 font-medium">
                            / {est.meta || "∞"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-600/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)} ${isCompleted ? "shadow-[0_0_10px_rgba(16,185,129,0.4)]" : ""}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Establecimiento
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Microred
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Meta Anual
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Avance
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map((est) => {
                    const hasMeta = est.meta > 0;
                    const percentage = hasMeta
                      ? (est.cantidad / est.meta) * 100
                      : 0;
                    return (
                      <tr
                        key=[HIDDEN]hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {est.nombre}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {est.microred}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                              {est.meta || "-"}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingEstablishment(est);
                                  setNewMetaValue(est.meta || "");
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent/5 transition-all"
                                title="Editar Meta"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-slate-800 dark:text-white">
                            {est.cantidad}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs font-bold ${getProgressTextColor(percentage)}`}
                            >
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Building2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            No se encontraron resultados
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Intenta ajustar los filtros de búsqueda
          </p>
        </div>
      )}

      {/* Modal de Edición de Meta */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <List size={20} className="rotate-45" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-accent/10 rounded-2xl text-accent">
                  <Target size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                    Editar Meta
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {editingEstablishment?.nombre}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                    Meta Anual de Atenciones
                  </label>
                  <input
                    type="number"
                    value={newMetaValue}
                    onChange={(e) =>
                      setNewMetaValue(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ej: 500"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all text-lg font-black text-slate-800 dark:text-white"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (editingEstablishment && newMetaValue !== "") {
                        updateMeta(
                          {
                            id:
                              editingEstablishment.id ||
                              editingEstablishment.id_establecimiento,
                            meta: Number(newMetaValue),
                          },
                          {
                            onSuccess: () => setIsEditModalOpen(false),
                          },
                        );
                      }
                    }}
                    disabled={isUpdatingMeta || newMetaValue === ""}
                    className="flex-1 px-6 py-4 bg-accent text-white font-bold rounded-2xl shadow-lg shadow-accent/30 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isUpdatingMeta ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Guardar Meta"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

```
---

# File: frontend\src\pages\PositiveCases.tsx
```typescript
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { mammographyApi, establishmentApi } from "../../services/api";
import {
  AlertTriangle,
  Search,
  User,
  Calendar,
  Activity,
  Building2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  X,
  History,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import PatientHistoryModal from "../components/PatientHistoryModal";
import { Mamografia } from "../types";
import {
  usePositiveCases,
  useMammographyExport,
} from "../hooks/queries/useMammographies";
import { useEstablecimientos } from "../hooks/queries/useEstablishments";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useTheme } from "../contexts/ThemeContext";

const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;

const extraerBirads = (raw: string | null | undefined) => {
  if (!raw) return null;
  const match = (raw + "").match(/BI-RADS[:\s]*(.+)/i);
  return match ? match[1].trim() : (raw + "").trim();
};

const getBiradsStyle = (birads: string | null) => {
  if (!birads)
    return "bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-600";
  const b = birads.toUpperCase();
  if (b.includes("4"))
    return "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800";
  if (b.includes("5"))
    return "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700";
  if (b.includes("6"))
    return "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100";
  return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800";
};

export default function PositiveCases() {
  const { isDark } = useTheme();
  const { isAdmin, perfil } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterBirads, setFilterBirads] = useState("");
  const [filterEstablecimiento, setFilterEstablecimiento] = useState("");
  const LIMIT = 15;

  const { data: establecimientos = [] } = useEstablecimientos();

  const apiFilters = useMemo(() => {
    const f: any = { soloPositivos: true };
    if (!isAdmin && perfil?.establecimiento_id) {
      f.establecimiento_id = perfil.establecimiento_id;
    }
    return f;
  }, [isAdmin, perfil]);

  const {
    data: rawPositivos = [],
    isLoading: loading,
    refetch,
  } = usePositiveCases(apiFilters);

  // Historial Paciente
  const [historyDni, setHistoryDni] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Establecer filtro inicial si no es admin
  useEffect(() => {
    if (!isAdmin && perfil?.establecimiento_id && establecimientos.length > 0) {
      const miEst = establecimientos.find(
        (e: any) => e.id === perfil.establecimiento_id,
      );
      if (miEst) {
        setFilterEstablecimiento(miEst.nombre);
      }
    }
  }, [isAdmin, perfil, establecimientos]);

  useEffect(() => {
    if (
      rawPositivos &&
      Array.isArray(rawPositivos) &&
      rawPositivos.length > 0
    ) {
      toast(
        `Alerta: Tienes ${rawPositivos.length} casos positivos que requieren seguimiento prioritario.`,
        {
          icon: "🚨",
          duration: 6000,
          style: {
            background: isDark
              ? "rgba(15, 23, 42, 0.7)"
              : "rgba(255, 255, 255, 0.7)",
            color: isDark ? "#ffffff" : "#1f2937",
          },
        },
      );
    }
  }, [!!rawPositivos]);

  const filteredAndSortedCases = useMemo(() => {
    const list = Array.isArray(rawPositivos)
      ? rawPositivos
      : Array.isArray(rawPositivos?.data)
        ? rawPositivos.data
        : [];
    let positivos = list.filter((m: Mamografia) =>
      POSITIVOS_REGEX.test((m.birads_mx || "").trim()),
    );

    const seen = new Map();
    positivos.sort((a: Mamografia, b: Mamografia) => {
      const dateA = a.atencion?.fecha
        ? new Date(a.atencion.fecha).getTime()
        : 0;
      const dateB = b.atencion?.fecha
        ? new Date(b.atencion.fecha).getTime()
        : 0;
      return dateB - dateA;
    });
    positivos.forEach((m: Mamografia) => {
      const dni = m.atencion?.paciente?.dni;
      if (dni && !seen.has(dni)) {
        seen.set(dni, m);
      } else if (!dni) {
        seen.set(`nodni_${m.id}`, m);
      }
    });
    positivos = Array.from(seen.values());

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      positivos = positivos.filter(
        (m: Mamografia) =>
          m.atencion?.paciente?.nombres?.toLowerCase().includes(q) ||
          m.atencion?.paciente?.dni?.includes(q),
      );
    }

    if (filterBirads) {
      positivos = positivos.filter(
        (m: Mamografia) => extraerBirads(m.birads_mx) === filterBirads,
      );
    }

    if (filterEstablecimiento) {
      positivos = positivos.filter(
        (m: Mamografia) =>
          m.atencion?.establecimiento?.nombre === filterEstablecimiento,
      );
    }
    return positivos;
  }, [rawPositivos, debouncedSearch, filterBirads, filterEstablecimiento]);

  const total = filteredAndSortedCases.length;
  const from = (page - 1) * LIMIT;
  const cases = filteredAndSortedCases.slice(from, from + LIMIT);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  const handleExport = async () => {
    try {
      const filters: any = { soloPositivos: true };
      if (debouncedSearch) filters.dni = debouncedSearch;
      if (filterBirads) filters.birads_mx = filterBirads;
      if (!isAdmin && perfil?.establecimiento_id) {
        filters.establecimiento_id = perfil.establecimiento_id;
      }

      const res = await mammographyApi.export(filters);
      let data: Mamografia[] = res.data;

      data = data.filter((m) =>
        POSITIVOS_REGEX.test((m.birads_mx || "").trim()),
      );

      const headers = [
        "DNI",
        "Paciente",
        "Fecha",
        "BI-RADS",
        "Establecimiento",
        "Teléfono",
        "Resultado",
      ];
      const rows = data.map((m) => [
        m.atencion?.paciente?.dni,
        m.atencion?.paciente?.nombres,
        m.atencion?.fecha,
        m.birads_mx,
        m.atencion?.establecimiento?.nombre,
        m.atencion?.paciente?.telefono,
        m.resultados_mx?.replace(/,/g, ";"),
      ]);

      const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `reporte_casos_positivos_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("No se pudo generar la exportación");
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 rounded-xl">
              <AlertTriangle size={22} className="text-rose-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Casos Positivos
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-1">
            Pacientes con BI-RADS 4, 5 o 6 — Seguimiento prioritario
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3.5 rounded-2xl font-bold shadow-sm transition-all active:scale-95"
          >
            <Download size={20} />
            Exportar
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-600 text-white px-5 py-3 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 dark:shadow-rose-900/40 flex items-center gap-2"
          >
            <AlertTriangle size={18} />
            {loading ? "..." : total} casos
          </motion.div>
          <button
            onClick={() => refetch()}
            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Alertas de contexto */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 mb-8 flex items-start gap-4"
      >
        <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-rose-800 dark:text-rose-300 text-sm">
            Pacientes con resultado positivo en mamografía
          </p>
          <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
            Se muestran casos únicos con BI-RADS 4 (A, B, C), 5 o 6. Los
            duplicados son excluidos automáticamente. Requieren seguimiento
            médico prioritario.
          </p>
        </div>
      </motion.div>

      {/* Barra de filtros mejorada */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por DNI o nombre de paciente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-medium dark:text-white"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Filter
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <select
              value={filterBirads}
              onChange={(e) => {
                setFilterBirads(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option key=[HIDDEN] value="">
                Todos los Nivel 4
              </option>
              {["4", "4A", "4B", "4C"].map((v) => (
                <option key=[HIDDEN]md:col-span-3 relative">
            <Building2
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <select
              value={filterEstablecimiento}
              onChange={(e) => {
                setFilterEstablecimiento(e.target.value);
                setPage(1);
              }}
              disabled={!isAdmin}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option key=[HIDDEN] value="">
                {isAdmin ? "Todas las Sedes" : "Mi Sede"}
              </option>
              {establecimientos.map((est) => (
                <option key=[HIDDEN]md:col-span-1">
            <button
              onClick={() => {
                setSearch("");
                setFilterBirads("");
                if (isAdmin) setFilterEstablecimiento("");
                setPage(1);
              }}
              title="Limpiar filtros"
              className="w-full h-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-rose-50/60 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800">
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">
                  Paciente
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">
                  BI-RADS MX
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">
                  Establecimiento
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">
                  Fecha Atención
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">
                  Contacto
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">
                  Resultado MX
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key=[HIDDEN]animate-pulse">
                        <td className="px-8 py-8" colSpan={6}>
                          <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                        </td>
                      </tr>
                    ))
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <AlertTriangle size={48} className="text-slate-200" />
                        <p className="font-bold">
                          No se encontraron casos positivos
                        </p>
                        <p className="text-xs">
                          Intenta cambiar los filtros de búsqueda
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cases.map((m: Mamografia, idx) => {
                    const label = extraerBirads(m.birads_mx || null);
                    return (
                      <motion.tr
                        key=[HIDDEN]hover:bg-rose-50/20 dark:hover:bg-rose-900/10 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="bg-rose-100 p-3 rounded-2xl group-hover:bg-rose-200 transition-colors">
                              <User size={18} className="text-rose-600" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-800 dark:text-white">
                                {m.atencion?.paciente?.nombres || "Sin nombre"}
                              </div>
                              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                DNI: {m.atencion?.paciente?.dni || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${getBiradsStyle(m.birads_mx || null)}`}
                          >
                            <Activity size={12} />
                            <p className="text-[10px] w-[65px]">
                              BI-RADS {label || "?"}
                            </p>
                          </span>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                            <Building2
                              size={14}
                              className="text-slate-300 shrink-0"
                            />
                            <span className="truncate max-w-[200px]">
                              {m.atencion?.establecimiento?.nombre || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                            <Calendar size={14} className="text-slate-300" />
                            {m.atencion?.fecha || "—"}
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
                            <Phone size={14} className="text-slate-300" />
                            {m.atencion?.paciente?.telefono || "Sin teléfono"}
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500 font-medium max-w-[200px] truncate">
                              {m.resultados_mx || m.sugerencia_mx || "—"}
                            </p>
                            <button
                              onClick={() => {
                                setHistoryDni(
                                  m.atencion?.paciente?.dni || null,
                                );
                                setIsHistoryOpen(true);
                              }}
                              title="Ver Historial"
                              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                            >
                              <History size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="px-8 py-6 bg-rose-50/30 dark:bg-slate-700/30 border-t border-rose-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest">
            {total} CASOS ÚNICOS POSITIVOS
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-600 rounded-2xl shadow-lg shadow-red-800 text-white font-black text-sm">
                {page} <span className="opacity-50 text-[10px]">DE</span>{" "}
                {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <PatientHistoryModal
        dni={historyDni}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

```
---

# File: frontend\src\pages\Settings.tsx
```typescript
import { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Palette,
  Save,
  Key,
  Building2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Moon,
  Sun,
  Monitor,
  Mail,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { userApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, perfil: profile } = useAuth();
  const { 
    mode, setMode, 
    accent, setAccent, 
    isDark,
    toastPosition, setToastPosition,
    toastDuration, setToastDuration
  } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Estados para formularios
  const [profileData, setProfileData] = useState({
    nombres: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState<{ [key: string]: any }>({
    email: true,
    push: true,
    weeklyReport: false
  });

  const updateNotificationSetting = async (id: string, value: any) => {
    if (id === 'position') {
      setToastPosition(value);
      toast.success(`Posición cambiada a ${value}`, { position: value as any });
    } else if (id === 'duration') {
      setToastDuration(value);
      toast.success(`Duración ajustada a ${value}ms`, { duration: value });
    } else {
      const prevValue = notifications[id];
      setNotifications(prev => ({ ...prev, [id]: value }));
      
      if (id === 'email') {
        try {
          await userApi.update(user.id, { notificaciones_email: value });
          toast.success(`Notificaciones por correo ${value ? 'activadas' : 'desactivadas'}`);
        } catch (error) {
          setNotifications(prev => ({ ...prev, [id]: prevValue }));
          toast.error('Error al guardar la preferencia');
        }
      } else {
        toast.success(`${id === 'email' ? 'Correo' : id === 'push' ? 'Push' : 'Reporte'} ${value ? 'activado' : 'desactivado'}`);
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: currentProfile } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          setProfileData({
            nombres: currentProfile?.nombres || '',
            email: currentUser.email || ''
          });

          if (currentProfile) {
            setNotifications(prev => ({
              ...prev,
              email: !!currentProfile.notificaciones_email
            }));
          }
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    };
    loadData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userApi.update(user.id, { nombres: profileData.nombres });
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error((error as any).response?.data?.error || (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword=[HIDDEN]Las contraseñas no coinciden');
    }

    setLoading(true);
    try {
      await userApi.update(user.id, { password: passwordData.newPassword });
      toast.success('Contraseña actualizada con éxito');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Mi Perfil' },
    { id: 'security', icon: Shield, label: 'Seguridad' },
    { id: 'theme', icon: Palette, label: 'Apariencia' },
    { id: 'notifications', icon: Bell, label: 'Notificaciones' }
  ];

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Personaliza tu entorno de trabajo en ONCO - SISTEM</p>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key=[HIDDEN]bg-white dark:bg-slate-700 text-accent shadow-sm shadow-accent'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] transition-colors duration-300">
        <div className="p-8 lg:p-12">

          {/* Pestaña: Perfil */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <User size={20} />
                </div>
                Información del Usuario
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Nombres Completos</label>
                    <input
                      type="text"
                      placeholder="Cargando..."
                      value={profileData.nombres}
                      onChange={e => setProfileData({ ...profileData, nombres: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                    <input
                      type="email"
                      disabled
                      value={profileData.email}
                      className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-3xl border border-slate-100 dark:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-slate-400" size={20} />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase">Sede Asignada</p>
                      <p className="font-bold text-slate-700 dark:text-white">{(profile as any)?.establecimiento?.nombre || 'Acceso Centralizado'}</p>
                    </div>
                  </div>
                  <span className="w-fit px-3 py-1 bg-accent-soft text-accent text-[10px] font-black uppercase rounded-lg">
                    Permisos: {profile?.rol}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white py-4 rounded-2xl font-black shadow-xl shadow-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? 'Guardando...' : 'Actualizar Perfil'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Pestaña: Seguridad */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                  <Key size={20} />
                </div>
                Acceso y Seguridad
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                    <input
                      type="password"
                      placeholder="Escribe tu nueva clave"
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Confirmar Nueva Contraseña</label>
                    <input
                      type="password"
                      placeholder="Repite la clave"
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  <Shield size={20} />
                  {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Pestaña: Apariencia */}
          {activeTab === 'theme' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                  <Palette size={20} />
                </div>
                Personalización del Tema
              </h2>

              <div className="space-y-10">
                {/* Selector de Modo */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Modo Visual</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'light', icon: Sun, label: 'Claro' },
                      { id: 'dark', icon: Moon, label: 'Oscuro' },
                      { id: 'system', icon: Monitor, label: 'Sistema' }
                    ].map(m => (
                      <button
                        key=[HIDDEN]bg-accent border-accent text-white shadow-lg shadow-accent'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <m.icon size={24} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de Color de Acento */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Color de Acento</label>
                  <div className="flex gap-4">
                    {[
                      { id: 'indigo', color: 'bg-[#4f46e5]', label: 'Índigo' },
                      { id: 'emerald', color: 'bg-[#059669]', label: 'Esmeralda' },
                      { id: 'rose', color: 'bg-[#e11d48]', label: 'Rosa' },
                      { id: 'blue', color: 'bg-[#3b82f6]', label: 'Azul' },
                      { id: 'sky', color: 'bg-[#0ea5e9]', label: 'Celeste' },
                      { id: 'purple', color: 'bg-[#7c3aed]', label: 'Morado' },
                      { id: 'pink', color: 'bg-[#ec4899]', label: 'Rosa Fuerte' },
                      { id: 'teal', color: 'bg-[#0d9488]', label: 'Teal' },
                      { id: 'lime', color: 'bg-[#84cc16]', label: 'Lima' },
                      { id: 'amber', color: 'bg-[#f59e0b]', label: 'Ámbar' }
                    ].map(c => (
                      <button
                        key=[HIDDEN]ring-4 ring-accent/30 scale-110 shadow-lg shadow-accent/20' : 'opacity-40 hover:opacity-100 hover:scale-105'
                          }`}>
                          {accent === c.id && <CheckCircle2 size={20} className="text-white" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${accent === c.id ? 'text-accent' : 'text-slate-400'}`}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pestaña: Notificaciones */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Bell size={20} />
                </div>
                Configuración de Notificaciones
              </h2>

              <div className="space-y-8">
                {/* Canales */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Canales de Comunicación</label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'email', icon: Mail, label: 'Alertas por Correo', desc: 'Recibe un aviso cuando se detecte un BI-RADS 4' },
                      { id: 'push', icon: Zap, label: 'Notificaciones Push', desc: 'Alertas en tiempo real en tu navegador' },
                      { id: 'weeklyReport', icon: Monitor, label: 'Resumen Semanal', desc: 'Informe estadístico de tamizajes realizados' }
                    ].map(n => (
                      <label
                        key=[HIDDEN]flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400">
                            <n.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{n.label}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{n.desc}</p>
                          </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all relative ${notifications[n.id] ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <input
                            type="checkbox"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            checked={notifications[n.id]}
                            onChange={() => updateNotificationSetting(n.id, !notifications[n.id])}
                          />
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications[n.id] ? 'left-7' : 'left-1'}`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personalización Hot-Toast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Posición en Pantalla</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        'top-left', 'top-center', 'top-right',
                        'bottom-left', 'bottom-center', 'bottom-right'
                      ].map(pos => (
                        <button
                          key=[HIDDEN]position', pos)}
                          className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${toastPosition === pos
                              ? 'bg-accent border-accent text-white shadow-md shadow-accent/20'
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-accent/30'
                            }`}
                        >
                          {pos.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Duración (ms)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range"
                        min="1000"
                        max="10000"
                        step="500"
                        value={toastDuration}
                        onChange={(e) => updateNotificationSetting('duration', parseInt(e.target.value))}
                        className="flex-1 accent-accent"
                      />
                      <span className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-black text-accent text-center">
                        {toastDuration}ms
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium italic">Tiempo que la notificación permanece visible.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}

```
---

# File: frontend\src\pages\UserList.tsx
```typescript
import { useEffect, useState } from 'react';
import { userApi } from '../../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus,
  Search,
  Edit,
  Trash2,
  Shield,
  MapPin,
  Building2,
  X
} from 'lucide-react';
import { establishmentApi } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import UserModal from '../components/UserModal';
import { Usuario, Establecimiento } from '../types';
import { useUsersList, useDeleteUser } from '../hooks/queries/useUsers';
import { useEstablecimientos } from '../hooks/queries/useEstablishments';

export default function UserList() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');

  const { data: users = [], isLoading: loading } = useUsersList();
  const { data: establecimientos = [] } = useEstablecimientos();
  const { mutate: deleteUser } = useDeleteUser();

  const filteredUsers = users.filter((u: Usuario) => {
    // No mostrar el usuario actual en la lista
    if (u.id === user?.id) return false;

    const matchesSearch = !search ||
      u.nombres?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRol = !filterRol || u.rol === filterRol;

    const matchesEst = !filterEstablecimiento || u.establecimiento?.id === filterEstablecimiento;

    return matchesSearch && matchesRol && matchesEst;
  });

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    deleteUser(id);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Gestión de Usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Administra el personal y los permisos de acceso al sistema</p>
        </div>

        <button
          onClick={() => {
            setSelectedUserId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-accent transition-all active:scale-95"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Control Bar Mejorada */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium dark:text-white"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Cualquier Rol</option>
              <option value="admin">Administrador</option>
              <option value="usuario">Usuario Estándar</option>
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterEstablecimiento}
              onChange={(e) => setFilterEstablecimiento(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Todas las Sedes</option>
              {establecimientos.map(est => (
                <option key=[HIDDEN]md:col-span-1">
            <button
              onClick={() => {
                setSearch('');
                setFilterRol('');
                setFilterEstablecimiento('');
              }}
              title="Limpiar filtros"
              className="w-full h-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-slate-400 hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Rol / Permisos</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Establecimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence mode="wait">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key=[HIDDEN]animate-pulse">
                      <td className="px-8 py-8" colSpan={4}>
                        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredUsers.map((u) => (
                    <motion.tr
                      key=[HIDDEN]hover:bg-accent-soft/30 dark:hover:bg-indigo-900/10 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl group-hover:bg-accent-soft/30 dark:group-hover:bg-indigo-900/30 transition-colors text-slate-500 dark:text-slate-300 group-hover:text-accent font-bold text-lg w-12 h-12 flex items-center justify-center">
                            {u.nombres?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-white">{u.nombres || 'Sin nombre'}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold">{u.email || 'S/E'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${u.rol === 'admin' ? 'bg-accent-soft text-accent border border-accent-soft'
                            : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                          <Shield size={12} />
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-bold">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-300" />
                          {u.establecimiento?.nombre || 'Acceso Global'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setIsModalOpen(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-accent hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        key=[HIDDEN]new'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUserId}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}

```
---

# File: frontend\src\types\index.ts
```typescript
export interface Paciente {
  dni: string;
  nombres: string;
  telefono?: string;
  edad?: number;
  direccion?: string;
  distrito?: string;
  historia_clinica?: string;
}

export interface Establecimiento {
  id: string;
  nombre: string;
}

export interface Atencion {
  id?: string;
  fecha?: string;
  paciente: Paciente;
  establecimiento?: Establecimiento;
}

export interface Mamografia {
  id: string;
  birads_mx?: string;
  resultados_mx?: string;
  sugerencia_mx?: string;
  atencion: Atencion;
}

export interface Usuario {
  id: string;
  email: string;
  nombres?: string;
  rol?: string;
  establecimiento?: Establecimiento;
}

export interface Perfil {
  id: string;
  nombres?: string;
  rol?: string;
  establecimiento_id?: string;
}

export interface Stats {
  totalPacientes: number;
  casosPositivos: number;
  biradsListos: number;
}

```
---

# File: frontend\src\utils\colors.ts
```typescript
export const getProgressColor = (percentage: number) => {
  if (percentage === 100) return 'bg-emerald-500';
  if (percentage >= 70) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
};

export const getProgressTextColor = (percentage: number) => {
  if (percentage <= 30) return 'text-rose-500';
  if (percentage <= 65) return 'text-amber-500';
  if (percentage <= 85) return 'text-emerald-400';
  return 'text-emerald-600';
};

```
---

# File: frontend\src\hooks\queries\useEstablishmentMutations.ts
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { establishmentApi } from "../../../services/api"; // Asumo que establishmentApi existe y tiene el método updateMeta

interface UpdateMetaPayload {
  id: string; // o number, dependiendo de tu backend
  meta: number;
}

export const useUpdateEstablishmentMeta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, meta }: UpdateMetaPayload) => {
      // Llamamos a la API para actualizar la meta.
      const response = await establishmentApi.updateMeta(id, meta);
      return response.data; // Devuelve la respuesta del backend si es necesario
    },
    onSuccess: () => {
      // Invalida la caché para que useMammographyStats se actualice automáticamente
      queryClient.invalidateQueries({ queryKey: ["mammographyStats"] });
      // Si tienes otro hook para listar establecimientos, invalida su caché también
      queryClient.invalidateQueries({ queryKey: ["establecimientos"] });
      console.log("Meta actualizada exitosamente.");
      // Podrías añadir un toast de éxito aquí
    },
    onError: (error: any) => {
      console.error("Error al actualizar meta:", error);
      // Podrías mostrar un toast de error aquí
      // Por ejemplo: toast.error("Error al actualizar meta: " + error.response?.data?.error || error.message);
    },
  });
};

```
---

# File: frontend\src\hooks\queries\useEstablishments.ts
```typescript
import { useMutation, useQuery } from "@tanstack/react-query";
import { establishmentApi } from "../../../services/api";

export const useEstablecimientos = () => {
  return useQuery({
    queryKey: ["establecimientos"],
    queryFn: async () => {
      const { data } = await establishmentApi.getEstablecimientos();
      return data;
    },
  });
};

export const useMicroredes = () => {
  return useQuery({
    queryKey: ["microredes"],
    queryFn: async () => {
      const { data } = await establishmentApi.getMicroredes();
      return data;
    },
  });
};

```
---

# File: frontend\src\hooks\queries\useMammographies.ts
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mammographyApi } from '../../../services/api';
import { Mamografia } from '../../types';
import toast from 'react-hot-toast';

export const useMammographyStats = () => {
  return useQuery({
    queryKey: ['mammographyStats'],
    queryFn: async () => {
      const { data } = await mammographyApi.getStats();
      return data;
    },
  });
};

export const useMammographiesList = (page: number, limit: number, filters: any) => {
  return useQuery({
    queryKey: ['mammographies', { page, limit, filters }],
    queryFn: async () => {
      const { data } = await mammographyApi.getAll(page, limit, filters);
      return data;
    },
  });
};

export const usePositiveCases = (filters: any) => {
  return useQuery({
    queryKey: ['positiveCases', filters],
    queryFn: async () => {
      // Pedimos un límite alto y filtramos en frontend, o pasamos a backend
      const { data } = await mammographyApi.getAll(1, 1000, filters);
      return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    },
  });
};

export const useMammographyExport = (filters: any) => {
  return useQuery({
    queryKey: ['mammographyExport', filters],
    queryFn: async () => {
      const { data } = await mammographyApi.export(filters);
      return data;
    },
    enabled: false, // Disparado manualmente
  });
};

export const useMutateMammography = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Mamografia> }) => {
      if (id) {
        const res = await mammographyApi.update(id, data);
        return res.data;
      }
      const res = await mammographyApi.create(data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['mammographyStats'] });
      queryClient.invalidateQueries({ queryKey: ['mammographies'] });
      queryClient.invalidateQueries({ queryKey: ['positiveCases'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al procesar la solicitud');
    }
  });
};

```
---

# File: frontend\src\hooks\queries\usePatients.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '../../../services/api';

export const usePatientHistory = (dni: string | null) => {
  return useQuery({
    queryKey: ['patientHistory', dni],
    queryFn: async () => {
      const { data } = await patientApi.getHistory(dni!);
      return data;
    },
    enabled: !!dni,
    retry: false, // Do not retry on 404
  });
};

```
---

# File: frontend\src\hooks\queries\useUsers.ts
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../../services/api';
import { Usuario } from '../../types';
import toast from 'react-hot-toast';

export const useUsersList = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await userApi.getAll();
      return data;
    },
  });
};

export const useMutateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Usuario> }) => {
      if (id) {
        const res = await userApi.update(id, data);
        return res.data;
      }
      const res = await userApi.create(data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al procesar el usuario');
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string | number) => {
      await userApi.delete(id);
    },
    onSuccess: () => {
      toast.success('Usuario eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el usuario');
    }
  });
};

```
---

# File: HOW_TO_USE.md
```md
# <p align="center">📖 Manual de Operaciones - ONCO - SISTEM</p>

---

## 📑 Tabla de Contenidos
- [🔐 Acceso de Seguridad](#-acceso-de-seguridad)
- [📈 Inteligencia de Datos (Dashboard)](#-inteligencia-de-datos-dashboard)
- [📥 Motor de Importación Excel](#-motor-de-importación-excel)
- [🚨 Gestión de Casos Críticos](#-gestión-de-casos-críticos)
- [🎨 Personalización](#-personalización)

---

## 🔐 Acceso de Seguridad
El sistema implementa un esquema de autenticación **Identity-First**.

1. Ingresa tu correo institucional y contraseña cifrada.
2. El sistema utiliza **JWT** gestionado por Supabase para mantener sesiones seguras.
3. Si pierdes acceso, contacta al administrador del sistema para un reset de credenciales.

---

## 📈 Inteligencia de Datos (Dashboard)
El Dashboard no es solo visual, es una herramienta de toma de decisiones:
*   **KPIs en Vivo**: Conteo total de mamografías vs. Meta mensual.
*   **Mapa de Calor**: Visualiza qué microredes están reportando más casos.
*   **Acciones Rápidas**: Accesos directos a las últimas 5 pacientes registradas.

---

## 📥 Motor de Importación Excel
Esta es la funcionalidad más robusta del sistema. Sigue estos pasos para una carga exitosa:

### 🛠️ Preparación del Archivo
- **Nombre:** Debe ser estrictamente `MAMOGRAFIA 2026.xlsx`.
- **Ubicación:** `backend/uploads/`.
- **Estructura:** El motor busca pestañas llamadas `ENE`, `FEB`, `MAR`, etc.

### 🧠 ¿Qué hace el sistema por ti?
- **Fuzzy Matching:** Si una columna se llama "D.N.I" o "DOCUMENTO", el sistema la reconoce como DNI automáticamente.
- **Data Cleaning:** Elimina espacios extra, formatea nombres a `Mayúsculas` y valida que el DNI tenga 8 dígitos.
- **Logs de Error:** Si una fila falla, no se detiene todo el proceso. El sistema registra el error en `backend/logs/errors.log` y continúa con la siguiente fila.

> [!TIP]
> Puedes ver el progreso de la importación en tiempo real si abres la consola del servidor.

---

## 🚨 Gestión de Casos Críticos
El seguimiento de casos **BI-RADS 4 y 5** es prioridad nacional:

1. Dirígete al módulo **"Casos Positivos"**.
2. Filtra por pacientes pendientes de referencia.
3. Registra la fecha de cita en el **HRH (Hospital Regional)**.
4. Actualiza la situación (Ej: "En Quimioterapia", "Cirugía Programada").

---

## 🎨 Personalización
ONCO - SISTEM se adapta a tu entorno:
- **Dark Mode:** Ideal para entornos clínicos con baja iluminación para reducir la fatiga visual.
- **Filtros Persistentes:** El sistema recuerda tu última búsqueda en la lista de mamografías durante la sesión activa.

---

<p align="center">
  <sub>ONCO - SISTEM v1.0.0 - Documentación para Desarrolladores y Usuarios Finales</sub>
</p>

```
---

# File: README.md
```md
# <p align="center">🏥 ONCO - SISTEM</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-ISC-orange" alt="License">
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933" alt="Backend">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Tailwind-61DAFB" alt="Frontend">
  <img src="https://img.shields.io/badge/Database-Supabase%20%7C%20PostgreSQL-3ECF8E" alt="Database">
</p>

---

## 🌟 Descripción General

**ONCO - SISTEM** es una solución "Full-Stack" de alto rendimiento diseñada para la **gestión, monitoreo y análisis oncológico**. El sistema optimiza el flujo de trabajo clínico permitiendo el seguimiento preciso de tamizajes de mamografía, la gestión de resultados críticos (BI-RADS) y la automatización inteligente de datos masivos.

> [!IMPORTANT]
> Diseñado específicamente para reducir la brecha entre la captura de datos manual y el análisis clínico oportuno.

---

## 🛠️ Tech Stack & Arquitectura

### 💻 Frontend (The "Eye")
| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **UI Framework** | React 19 + Vite | Renderizado ultra-rápido y DX superior. |
| **Styling** | Tailwind CSS 4 | Diseño atómico y responsivo. |
| **Animations** | Framer Motion | Feedback visual y transiciones fluidas. |
| **Charts** | Chart.js | Visualización de KPIs y tendencias. |
| **Icons** | Lucide React | Iconografía vectorial moderna. |

### ⚙️ Backend (The "Brain")
- **Core:** Node.js v18+ & Express 5 (Next-gen routing).
- **Database & Auth:** Supabase (PostgreSQL) para integridad referencial y seguridad robusta.
- **Data Engine:** XLSX (SheetJS) con algoritmos de normalización personalizados.
- **Real-time:** WebSockets (ws) para sincronización de procesos pesados.

---

## 📂 Estructura del Ecosistema

```bash
ONCO - SISTEM/
├── 🚀 backend/           # Lógica de API & Data Processing
│   ├── 🛠️ config/        # Supabase client & settings
│   ├── 🎮 controllers/   # Request handlers
│   ├── 🛤️ routes/        # Endpoint definitions
│   ├── 🧠 services/      # Business logic (Excel Engine, DB Services)
│   └── 🔧 utils/         # Validators, Normalizers & Loggers
├── 🎨 frontend/          # SPA (Single Page Application)
│   ├── 🧩 components/    # Reusable UI Blocks
│   ├── 🧪 contexts/      # Global State Management
│   └── 📖 pages/         # View compositions
└── 📁 uploads/           # Buffer para archivos .xlsx
```

---

## 🚦 Guía de Inicio Rápido

### 1️⃣ Clonación y Dependencias
```bash
# Clonar el core
git clone <repo-url>
cd ONCO - SISTEM

# Levantar el cerebro (Backend)
cd backend && npm install

# Levantar la vista (Frontend)
cd ../frontend && npm install
```

### 2️⃣ Variables de Entorno (.env)
Configura los archivos `.env` en sus respectivas carpetas:

**Backend:**
```ini
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=[HIDDEN]
```
---

# File: docs\documento.md
```md
# Proyecto ONCO - SISTEM (Fase 1: Mamografías)

¡Hola! Aquí tienes el resumen técnico y funcional de cómo está construido ONCO - SISTEM y qué ventajas te ofrece ahora que estamos lanzando esta **Primera Fase enfocada exclusivamente en tamizaje de mamografías**.

---

## 1. El Stack Tecnológico (¿Con qué está hecho?)
Para que la plataforma sea súper rápida y no se cuelgue, usamos las mismas herramientas que utilizan las empresas de tecnología grandes. No es un programa viejo, todo es web y moderno:

* **Frontend (Lo que tú ves):**
  * **React 18 + Vite:** Hace que la plataforma sea rapidísima. Cuando cambias de ventana, no se recarga la página en blanco.
  * **React Query:** Guarda datos temporalmente (caché). Si entras a ver tus casos y vuelves al inicio, carga todo al instante.
  * **Tailwind CSS + Framer Motion:** Para el diseño visual. Permite tener el *Modo Oscuro* (para no cansarte la vista) y las animaciones suaves (como las ventanas emergentes).
  * **Chart.js:** La herramienta que dibuja los gráficos interactivos del inicio.

* **Backend (El motor detrás de escena):**
  * **Node.js con Express:** Un servidor muy rápido que aguanta que varios centros de salud estén conectados al mismo tiempo sin ponerse lento.

* **Base de Datos y Seguridad:**
  * **Supabase (PostgreSQL):** Una base de datos súper robusta y segura. Es imposible que los datos se mezclen (por ejemplo, cruzar el resultado de una paciente con otra).
  * **Tokens JWT:** Cada vez que entras con tu usuario, el sistema crea una "llave secreta" que asegura que un establecimiento solo pueda ver a sus propios pacientes.

---

## 2. ¿Qué te ofrece el sistema hoy?
En esta primera fase de mamografías, el sistema ya tiene todo esto listo para usarse:

* **Dashboard Visual:** Apenas entras, tienes gráficos y tarjetas de resumen que te dicen exactamente cómo van los despistajes en tiempo real.
* **Alertas de Casos Positivos:** Una pantalla dedicada solo a las pacientes críticas (BI-RADS 4, 5 y 6). Tienen etiquetas de colores brillantes para que ninguna paciente grave se quede sin seguimiento.
* **Línea de Tiempo del Paciente:** Al hacer clic en un DNI, te sale una ventana muy limpia que te muestra todo el historial y atenciones pasadas de esa paciente, ordenado por fechas.
* **Seguimiento de Metas:** Barras de progreso que te muestran visualmente si tu sede o microred está cerca de cumplir la meta anual de tamizajes.
* **100% Adaptable:** Puedes usarlo desde tu laptop, la computadora de la posta o tu celular. El diseño se acomoda a cualquier pantalla.

---

## 3. ONCO - SISTEM vs. Excel (Por qué era necesario el cambio)

Sabemos que Excel es útil para empezar, pero para gestionar salud se queda corto muy rápido. Aquí la diferencia de usar tu nuevo sistema:

| Lo que pasaba en Excel ❌ | Lo que logras con ONCO - SISTEM ✅ |
| :--- | :--- |
| **Buscar era lento:** Tenías que hacer *Control+B*, filtrar columnas y podías borrar celdas por error. | **Búsqueda instantánea:** Escribes un DNI o nombre y te aparece el historial completo como una línea de tiempo limpia y protegida. |
| **Gráficos manuales:** Para ver cómo ibas en el mes, tenías que seleccionar datos y armar tus propios gráficos. | **Dashboard automático:** El sistema calcula los totales, dibuja los gráficos y las barras de meta de avance de manera automática en tiempo real. |
| **Casos graves perdidos:** Una paciente BI-RADS 5 era solo una fila más en un mar de datos blancos. | **Alertas visuales:** El sistema etiqueta con colores llamativos a los casos positivos para que tengan prioridad inmediata. |
| **Archivos pesados:** Mientras más pacientes metías, más demoraba en abrir o guardar el archivo. | **Velocidad en la nube:** Base de datos PostgreSQL que puede guardar un millón de mamografías y seguirá cargando al instante en tu navegador. |
| **Problemas de permisos:** Si le pasabas el Excel a otro centro, podían ver todo o modificar cosas que no debían. | **Cuentas por rol:** Cada establecimiento tiene su propio usuario. Entran, ven solo lo suyo, registran y listo. |

---

¡Esta Fase 1 es solo el inicio! Con esta base sólida ya instalada, escalar para meter otras áreas de oncología será mucho más fluido.

```
---

# File: backend/package.json
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "@supabase/supabase-js": "^2.105.4",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "nodemailer": "^8.0.8",
    "ws": "^8.20.1",
    "xlsx": "^0.18.5"
  }
}

```
---

# File: frontend/package.json
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.105.4",
    "@tailwindcss/vite": "^4.3.0",
    "@tanstack/react-query": "^5.100.11",
    "@tanstack/react-query-devtools": "^5.100.11",
    "axios": "^1.16.1",
    "chart.js": "^4.5.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^19.2.6",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.15.1",
    "tailwind-merge": "^3.6.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^25.9.1",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "postcss": "^8.5.14",
    "tailwindcss": "^4.3.0",
    "typescript": "^6.0.3",
    "vite": "^8.0.12"
  }
}

```
---

# File: check_atenciones_sn.js
```js
require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function checkAtencionesSN() {
  const { data, error } = await supabase
    .from('atenciones')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const problematic = data.filter(a => JSON.stringify(a).includes('S/N'));
  console.log('Atenciones containing "S/N":', problematic.length);
  problematic.forEach(a => {
    console.log(`ID: ${a.id}, Data: ${JSON.stringify(a)}`);
  });
}

checkAtencionesSN();

```
---

# File: check_duplicates.js
```js
require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function checkDuplicateDnis() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('dni');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const dnis = data.map(p => p.dni);
  const counts = {};
  dnis.forEach(d => {
    counts[d] = (counts[d] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([d, c]) => c > 1);
  console.log('Duplicate DNIs:', duplicates.length);
  duplicates.forEach(([d, c]) => {
    console.log(`DNI: ${d}, Count: ${c}`);
  });
}

checkDuplicateDnis();

```
---

# File: check_empty_birads.js
```js
require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function checkEmptyBirads() {
  const { data, error } = await supabase
    .from('detalle_mamografia')
    .select('id, birads_mx');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const problematic = data.filter(m => m.birads_mx && m.birads_mx.trim().toUpperCase() === 'BI-RADS');
  console.log('Problematic birads_mx (only "BI-RADS"):', problematic.length);
  problematic.forEach(m => {
    console.log(`ID: ${m.id}`);
  });
}

checkEmptyBirads();

```
---

# File: check_unusual_ids.js
```js
require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function checkUnusualIds() {
  const { data, error } = await supabase
    .from('atenciones')
    .select('paciente_id')
    .lt('paciente_id', 1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Atenciones with paciente_id < 1:', data.length);
  data.forEach(a => {
    console.log(`Paciente ID: ${a.paciente_id}`);
  });
}

checkUnusualIds();

```
---
