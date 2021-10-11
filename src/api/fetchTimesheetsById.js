const { API, KnackFilter } = require('../../api')

async function fetchTimesheetsById(id) {
  const filter = new KnackFilter();
  filter.addRule('field_111', 'is', id);
  return await API.getMany(13, filter.parsedRules)
}

module.exports = fetchTimesheetsById;
