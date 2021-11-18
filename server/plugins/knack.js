'use strict';
// Load modules

// const Request = require('request-promise');
const Request = require('promise-request-retry');
const QueryString = require('querystring');


// Declare internals

const internals = {};


internals.knack = {
    protocol: 'https',
    host: 'us-api.knack.com',
    apiVer: '/v1'
};


exports.plugin = {
    name: 'Knack',
    register: function (server) {

        server.expose('create', internals.create);
        server.expose('delete', internals.delete);
        server.expose('find', internals.find);
        server.expose('findById', internals.findById);
        server.expose('update', internals.update);
        server.expose('getAllRecords', internals.getAllRecords);
        server.expose('upload', internals.upload);
        server.expose('objects', internals.objects);
    }
};


internals.getUri = function () {

    const { knack } = internals;
    return `${knack.protocol}://${knack.host}${knack.apiVer}`;
};

internals.objects = () => {

    return {
        Suppliers: 'object_1',
        Stock: 'object_2',
        PurchaseOrders: 'object_3',
        PurchaseOrdersItems: 'object_6',
        POSubcontractorLines: 'object_20',
        StockAdjustments: 'object_7',
        Dockets: 'object_8',
        PODockets: 'object_18',
        Assets: 'object_10',
        AssetsJobs: 'object_9',
        AssetIssues: 'object_16',
        MaintenanceParts: 'object_11',
        MaintenanceSubcontractors: 'object_12',
        MaintenanceHours: 'object_13',
        Files: 'object_14',
        MaintenanceInvoices: 'object_17',
        Staff: 'object_19'        
    };
};

internals.acceptedErrorCodes = () => {
    const sArray = [];

    for (let i = 0; i < 52; i++) {
        const status = 400 + i;
        sArray.push(status);
    }

    return sArray;
};

internals.update = (info) => {

    const options = {
        uri: `${internals.getUri()}/objects/${info.objectKey}/records/${info.id}`,
        method: 'PUT',
        form: info.body,
        headers: {
            'X-Knack-Application-ID': info.appID || process.env.KNACK_APP_ID,
            'X-Knack-REST-API-Key': info.apiKey || process.env.KNACK_API_KEY
        },
        retry : 3,
        accepted: internals.acceptedErrorCodes(),
        delay: 5000
    };

    return Request(options);
};


internals.create = (info) => {

    const options = {
        uri: `${internals.getUri()}/objects/${info.objectKey}/records`,
        method: 'POST',
        form: info.body,
        headers: {
            'X-Knack-Application-ID': info.appID || process.env.KNACK_APP_ID,
            'X-Knack-REST-API-Key': info.apiKey || process.env.KNACK_API_KEY
        },
        retry : 3,
        accepted: internals.acceptedErrorCodes(),
        delay: 5000
    };

    return Request(options);
};

internals.delete = (info) => {

    const options = {
        uri: `${internals.getUri()}/objects/${info.objectKey}/records/${info.id}`,
        method: 'DELETE',
        headers: {
            'X-Knack-Application-ID': info.appID || process.env.KNACK_APP_ID,
            'X-Knack-REST-API-Key': info.apiKey || process.env.KNACK_API_KEY
        },
        retry : 3,
        accepted: internals.acceptedErrorCodes(),
        delay: 5000
    };

    return Request(options);
};

internals.find = (info) => {

    const query = QueryString.stringify({
        page: info.page || 1,
        rows_per_page: info.rowsPerPage || 1000,
        filters: JSON.stringify(info.filters || [])
    });
    const options = {
        uri: `${internals.getUri()}/objects/${info.objectKey}/records?${query}`,
        method: 'GET',
        json: true,
        headers: {
            'X-Knack-Application-ID': info.appID || process.env.KNACK_APP_ID,
            'X-Knack-REST-API-Key': info.apiKey || process.env.KNACK_API_KEY
        },
        retry : 3,
        accepted: internals.acceptedErrorCodes(),
        delay: 5000
    };

    return Request(options);
};

internals.findById = (info) => {

    const options = {
        uri: `${internals.getUri()}/objects/${info.objectKey}/records/${info.id}`,
        method: 'GET',
        json: true,
        headers: {
            'X-Knack-Application-ID': info.appID || process.env.KNACK_APP_ID,
            'X-Knack-REST-API-Key': info.apiKey || process.env.KNACK_API_KEY
        },
        retry : 3,
        accepted: internals.acceptedErrorCodes(),
        delay: 5000
    };

    return Request(options);
};

internals.getAllRecords = async (page, filters, key) => {

  const response = await internals.find({
      objectKey: key,
      rowsPerPage: 1000,
      filters: filters || [],
      page: page || 1,
  });

  if (response.current_page < response.total_pages) {
      return response.records.concat(
          await internals.getAllRecords(page + 1, filters, key)
      );
  }
  return response.records;
};

internals.upload = (info) => {

  info.type = info.type || 'image';

  const options = {
    uri: `${internals.getUri()}/applications/${process.env.KNACK_APP_ID}/assets/${info.type}/upload`,
    method: 'POST',
    formData: info.body,
    headers: {
      'X-Knack-Application-ID': info.appID || process.env.KNACK_APP_ID,
      'X-Knack-REST-API-Key': info.apiKey || process.env.KNACK_API_KEY
    },
    retry: 3,
    accepted: internals.acceptedErrorCodes(),
    delay: 5000
  };

  return Request(options);
};
