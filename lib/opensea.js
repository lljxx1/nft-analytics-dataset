const axios = require("axios");
const fs = require("fs");
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

async function fetchEvents(params) {
  try {
    const { data } = await axios.get("https://api.opensea.io/api/v1/events", {
      params: params,
    });
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

async function fetchEventsWithRetry(args, maxRetry = 5) {
  let result = null;
  for (let index = 0; index < maxRetry; index++) {
    try {
      result = await fetchEvents(args);
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
  const offset = (page - 1) * pageSize;
  const apiKey = await getApiKey();
  // console.log({
  //   offset,
  //   pageSize,
  //   apiKey
  // })
  console.log("page", page);
  if (offset > 10000) {
    console.log("limit max", 1000);
    return {
      assets: []
    };
  }

  let retry = 10;
  for (let index = 0; index < retry; index++) {
    try {
      const { data } = await axios.get(
        "https://api.opensea.io/api/v1/assets",
        {
          params: {
            collection: slug,
            offset: offset,
            limit: pageSize,
          },
        },
        {
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
      await wait(30 * 1000);
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
