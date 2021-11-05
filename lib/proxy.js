const axiosProxy = require('axios-https-proxy-fix');
const { PROXY } = require('../config.json');

const http = require('http');
const https = require('https');

http.Agent.defaultMaxSockets = Infinity;
https.Agent.defaultMaxSockets = Infinity;

async function getUrl(url, args, conf) {
  conf.proxy = null;
  const res = await axiosProxy.get(url, args, conf);
  return res;
}

module.exports = {
  proxy: PROXY,
  getUrl
}