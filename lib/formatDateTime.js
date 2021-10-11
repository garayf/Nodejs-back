const moment = require("moment");

function formatDateTime(dateValue, timeValue) {
  const date = dateValue
    ? moment(dateValue, "DD/MM/YYYY").format("DD/MM/YYYY")
    : moment().format("DD/MM/YYYY");
  const time = timeValue
    ? moment(timeValue, "H:mm").format("H:mma")
    : moment().format("H:mma");

  return `${date} ${time}`;
}

module.exports = formatDateTime;
