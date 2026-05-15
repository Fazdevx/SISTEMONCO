const isValidDni = (dni) => {
  if (!dni) return false;
  const dniStr = dni.toString();
  // DNI peruano debe tener exactamente 8 dígitos numéricos
  return /^\d{8}$/.test(dniStr);
};

const INVALID_NAMES = [
  'TOTAL',
  'PACIENTES',
  'ENERO',
  'FEBRERO',
  'MARZO'
];

const isValidName = (name) => {

  if (!name) return false;

  const cleanName = name
    .toString()
    .trim()
    .toUpperCase();

  if (cleanName.length < 5) {
    return false;
  }

  return !INVALID_NAMES.some(
    invalid => cleanName.includes(invalid)
  );

};
const isValidDate = (value) => {

  if (!value) return false;

  const date = new Date(value);

  return !isNaN(date.getTime());

};
const isValidAge = (age) => {

  if (!age) return false;

  const parsedAge = Number(age);

  return parsedAge >= 0 && parsedAge <= 120;

};
module.exports = {
  isValidDni,
  isValidName,
  isValidDate,
  isValidAge
};