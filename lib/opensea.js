const axios = require("axios");
const fs = require("fs");
const { getUrl, proxy } = require('./proxy');

const { OPENSEA_API_KEYS  } = require('../config.json');
let _keyCousr = 0;

async function getApiKey() {
  if (!OPENSEA_API_KEYS[_keyCousr]) {
    _keyCousr = 0;
  }
  const key = OPENSEA_API_KEYS[_keyCousr];
  _keyCousr++;
  return key;
}

async function fetchEvents(params, pageNo) {
  // const offset = (page - 1) * pageSize;
  let apiKey = await getApiKey();
  try {
    const { data } = await getUrl(
      "https://api.opensea.io/api/v1/events",
      {
        params: params,
      },
      {
        proxy: proxy,
        headers: {
          "X-API-KEY": apiKey,
        },
      }
    );
    return data.asset_events;
  } catch (e) {
    console.log(e.response.data);
    throw new Error(e.response.data.detail);
  }
  return [];
}

async function fetchOrders(params) {
  try {
    const { data } = await axios.get(
      "https://api.opensea.io/wyvern/v1/orders",
      {
        params: params,
      }
    );
    return data.orders;
  } catch (e) {
    console.log(e.response.data);
    throw new Error(e.response.data.detail);
  }
  return [];
}

async function fetchEventsWithRetry(args, pageNo, maxRetry = 5) {
  let result = null;
  for (let index = 0; index < maxRetry; index++) {
    try {
      result = await fetchEvents(args, pageNo);
      break;
    } catch (e) {
      console.log(e, args);
      await wait(30 * 1000);
    }
  }
  return result;
}


async function fetchCollectionTokens(slug, page = 1) {
  const pageSize = 50;
  let offset = (page - 1) * pageSize;
  let apiKey = await getApiKey();
  let order_direction = 'desc';
  console.log({
    offset,
    pageSize,
    apiKey
  })
  console.log("page", page);
  if (offset > 10000) {
    offset = (page - 201) * pageSize;
    order_direction = 'asc';
    if (offset > 10000) {
      return {
        assets: []
      };
    }
  }

  let retry = 10;
  for (let index = 0; index < retry; index++) {
    try {
      const { data } = await getUrl(
        "https://api.opensea.io/api/v1/assets",
        {
          params: {
            collection: slug,
            offset: offset,
            limit: pageSize,
            order_direction
          },
        },
        {
          proxy: proxy,
          headers: {
            "X-API-KEY": apiKey,
          },
        }
      );
      return {
        page,
        assets: data.assets,
      };
    } catch (e) {
      console.log(e.response ? e.response.data.detail : e);
      console.log('wait')
      await wait(10 * 1000);
      apiKey = await getApiKey();
    }
    console.log("retry", index);
  }
  return [];
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}


module.exports = {
  fetchEventsWithRetry,
  fetchCollectionTokens,
  fetchEvents,
  fetchOrders,
};
