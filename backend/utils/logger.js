const logError = ({
  file,
  sheet,
  row,
  message
}) => {
  const log = `[ERROR] [${new Date().toISOString()}] Archivo: ${file}, Hoja: ${sheet}, Fila: ${row}, Error: ${message}`;
  console.error(log);
};

const logSuccess = (message) => {
  console.log(`[SUCCESS] [${new Date().toISOString()}] ${message}`);
};

module.exports = {
  logError,
  logSuccess
};