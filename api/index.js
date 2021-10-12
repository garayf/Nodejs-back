const API = require('./knack');
const KnackApi = new API(
  "6109af925a5ef5001eef4787",
  "5d3b2f08-3582-4d1f-bfd1-4390002e4856"
);

const KnackFilter = require('./filter');

module.exports = {
  KnackApi,
  KnackFilter,
};
