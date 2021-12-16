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
  let apiKey = await getApiKey();
  try {
    const { data } = await getUrl(
      "https://api.opensea.io/api/v1/events",
      {
        params: params,
        headers: {
          "X-API-KEY": apiKey,
          "User-Agent": "curl/1.4.3",
        },
      }
    );
    return data.asset_events;
  } catch (e) {
    console.log("fetchEvents", e, params, apiKey);
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
      await wait(60 * 1000);
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
            order_direction,
          },
          headers: {
            "X-API-KEY": apiKey,
            "User-Agent": "curl/1.4.3",
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
      await wait(20 * 1000);
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


async function fetchCollection(slug) {
  let apiKey = await getApiKey();
  let retry = 10;
  for (let index = 0; index < retry; index++) {
    try {
      const { data } = await getUrl(
        `https://api.opensea.io/api/v1/collection/${slug}`,
        {
          params: {},
          headers: {
            "X-API-KEY": apiKey,
            "User-Agent": "curl/1.4.3",
          },
        }
      );
      return data.collection;
    } catch (e) {
      console.log(e.response ? e.response.data.detail : e.toString());
      console.log("wait");
      await wait(2 * 1000);
      apiKey = await getApiKey();
    }
    console.log("retry", index);
  }
  return null;
}



async function test() {
  const events = await fetchEvents({
    event_type: 'transfer',
    asset_contract_address: '0x8707276df042e89669d69a177d3da7dc78bd8723',
    token_id: '5197',
    limit: 200
  })
  console.log(events)
}

// test();

module.exports = {
  fetchCollection,
  fetchEventsWithRetry,
  fetchCollectionTokens,
  fetchEvents,
  fetchOrders,
};
