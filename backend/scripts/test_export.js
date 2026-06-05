require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const mammographyService = require('../services/mammographyService');

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
