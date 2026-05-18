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
