const axiosProxy = require('axios-https-proxy-fix');
const { PROXY } = require('../config.json');

const http = require('http');
const https = require('https');

http.Agent.defaultMaxSockets = Infinity;
https.Agent.defaultMaxSockets = Infinity;

async function getUrl(url, args, headers) {
  // conf.proxy = null;
  const res = await axiosProxy.get(url, args, {
    // proxy: PROXY,
    headers
  });
  return res;
}

module.exports = {
  proxy: PROXY,
  getUrl
}