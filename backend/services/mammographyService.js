// services/mammographyService.js
const supabase = require('../config/supabase');

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

module.exports = {
  insertMammographyBatch
};