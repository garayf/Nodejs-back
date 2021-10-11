const API = require('./knack');
const KnackApi = new API(
  "611980f7b5227c001e49da19",
  "6b15873b-87bc-4168-8978-d83773d23757"
);

const KnackFilter = require('./filter');

module.exports = {
  KnackApi,
  KnackFilter,
};
