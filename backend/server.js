require('dotenv').config();

const express = require('express');
const cors = require('cors');

const importRoutes = require('./routes/importRoutes');

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json({
  limit: '10mb'
}));

app.get('/', (req, res) => {
  res.json({
    status: 'OK'
  });
});

app.use('/import', importRoutes);

app.use((err, req, res, next) => {

  console.error(err);

  res.status(500).json({
    success: false,
    error: err.message
  });

});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});