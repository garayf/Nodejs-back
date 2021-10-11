const fetch = require("node-fetch");

function createOrUpdateRecords(tableId, rows, integrationKey, companyId) {
  const URL = "https://secure-au.appenate.com:443/api/v2/datasource";
  const data = {
    Id: tableId,
    IntegrationKey: integrationKey,
    NewRows: rows,
    CompanyId: companyId,
  };
  return new Promise((resolve, reject) => {
    fetch(URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((resp) => { 
        if (resp.ok) {
          resolve(resp.json());
        } else {
          reject("not working");
        }
      })
      .catch((error) => {
        reject(error);
      });
  }).catch((error) => {
    console.log(error);
  });
}

module.exports = createOrUpdateRecords;
