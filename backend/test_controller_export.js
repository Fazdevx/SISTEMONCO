require('dotenv').config();
const mammographyController = require('./controllers/mammographyController');

const req = {
  query: {}
};

const res = {
  json: (data) => {
    console.log('Respuesta recibida! Longitud:', data.length);
  },
  status: (code) => {
    console.log('Status code:', code);
    return {
      json: (data) => console.log('Error data:', data)
    };
  }
};

async function testController() {
  console.log('Probando exportMammographies controller...');
  await mammographyController.exportMammographies(req, res);
}

testController();
