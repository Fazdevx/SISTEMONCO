const fs = require('fs');

const logError = ({
  file,
  sheet,
  row,
  message
}) => {

  const log = `
[${new Date().toISOString()}]
Archivo: ${file}
Hoja: ${sheet}
Fila: ${row}
Error: ${message}

`;

  fs.appendFile(
    './logs/errors.log',
    log,
    (error) => {

      if (error) {
        console.error(error);
      }

    }
  );

};
const logSuccess = (message) => {

  fs.appendFile(
    './logs/success.log',
    `${new Date().toISOString()} - ${message}\n`,
    () => {}
  );

};
module.exports = {
  logError,
  logSuccess
};