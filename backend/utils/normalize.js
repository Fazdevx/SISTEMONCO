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
    
    // Si el string contiene letras, pero NO es un formato conocido (dd/mm/yyyy, yyyy-mm-dd, o mmm-yy) -> null
    const isKnownFormat = 
      /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed) || 
      /^\d{4}-\d{2}-\d{2}/.test(trimmed) || 
      /^[a-z]{3}-\d{2}$/i.test(trimmed);

    if (/[a-zA-Z]/i.test(trimmed) && !isKnownFormat) {
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
    
    // Formato "ene-26" (mes abreviado)
    const monthNames = { 'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12' };
    const monthMatch = trimmed.toLowerCase().match(/^([a-z]{3})-(\d{2})$/);
    if (monthMatch) {
      const month = monthNames[monthMatch[1]];
      if (month) {
        const year = `20${monthMatch[2]}`;
        return new Date(`${year}-${month}-01`);
      }
    }

    // Formato "yyyy-mm-dd" o "yyyy-mm-dd HH:MM:SS"
    const date = new Date(trimmed);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date;
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