const axiosProxy = require('axios-https-proxy-fix');
const { PROXY } = require('../config.json');
const axios = require('axios');

const http = require('http');
const https = require('https');

http.Agent.defaultMaxSockets = Infinity;
https.Agent.defaultMaxSockets = Infinity;

async function getUrl(url, args, headers) {
  // conf.proxy = null;
  const res = await axios.get(url, args);
  return res;
}

module.exports = {
  proxy: PROXY,
  getUrl
}