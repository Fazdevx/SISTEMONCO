require('dotenv').config();
const { getDashboardStats } = require('../services/mammographyService');

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
