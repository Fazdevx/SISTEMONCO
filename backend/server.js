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