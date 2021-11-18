'use strict';
// Load modules
const axios = require('axios').default;

const instance = axios.create({
  baseURL: 'https://service.formitize.com/api/rest/v2/',
  // timeout: 1000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent':process.env.FM_COMPANY
  },
  auth:{
    "username": process.env.FM_COMPANY_USER,
    "password": process.env.FM_USER_PASSWORD
  }
});

exports.plugin = {
  name: 'AxiosFM',
  instance,
};
// export default instance;
