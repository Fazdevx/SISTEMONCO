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

      const key =
        `${attention.paciente_id}_${attention.fecha}`;

      attentionCache.set(
        key,
        attention
      );

    }

    return data;

  } catch (error) {

    console.error(
      'Error insertando atenciones:',
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