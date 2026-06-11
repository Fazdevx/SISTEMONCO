require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// 1. Configuración de Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 2. Importación de Rutas
const mammographyRoutes = require('./routes/mammographyRoutes');
const userRoutes = require('./routes/userRoutes');
const establishmentRoutes = require('./routes/establishmentRoutes');
const importRoutes = require('./routes/importRoutes');
const mappingRoutes = require('./routes/mappingRoutes');
const patientRoutes = require('./routes/patientRoutes');

// 3. Definición de Rutas
// Creamos un router para agrupar todas las rutas bajo /api
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

apiRouter.use('/mammographies', mammographyRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/microredes', establishmentRoutes);
apiRouter.use('/establecimientos', establishmentRoutes);
apiRouter.use('/patients', patientRoutes);
apiRouter.use('/mappings', mappingRoutes);
apiRouter.use('/import', importRoutes);

// Usamos el router tanto en /api como en / para mayor compatibilidad con rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 4. Manejo de Errores
app.use((err, req, res, next) => {
  console.error('--- SERVER ERROR ---');
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
  });
}
