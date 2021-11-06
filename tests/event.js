const { fetchEventsWithRetry } = require("./lib/opensea");
const topCollections = require("./topCollection200.json");
const { Event } = require('./db');
const status = require("./status.json");
const fs = require('fs');
const moment = require('moment');

async function setValue(key, value) {
  status[key] = value;
  fs.writeFileSync("./status.json", JSON.stringify(status, null, 2));
}

async function parseAndSave(collection, eventType, events) {
  const parsed = events.map((_) => {
    console.log(_)
    return {
      id: _.id,
      token_id: _.asset && _.asset.token_id,
      collection_slug: _.collection_slug,
      timestamp: _.transaction && _.transaction.timestamp,
      event_type: _.event_type,
      from_account: _.from_account ? _.from_account.address : null,
      to_account: _.to_account ? _.to_account.address : null,
      transaction: _.transaction && _.transaction.block_hash,
      owner: _.asset && _.asset.owner.address,
      transaction_from_account:
        _.transaction &&
        _.transaction.from_account &&
        _.transaction.from_account.address,
      transaction_to_account:
        _.transaction &&
        _.transaction.to_account &&
        _.transaction.to_account.address,
      payment_token: _.payment_token && _.payment_token.symbol,
      seller: _.seller && _.seller.address,
      winner_account: _.winner_account && _.winner_account.address,
      price: _.total_price
    };
  });

  const results = await Event.bulkCreate(parsed, {
    ignoreDuplicates: true,
  });
  // console.log('parseAndSave', collection, eventType, results.length);
}

async function fetchCollectionAllEvents(slug, eventType = 'transfer') {
  let timeBefore = null;
  let totalEvents = 0;
  let lastEvent = null;
  for (let index = 0; index < Infinity; index++) {
    const queryFilter = {
      offset: 0,
      event_type: eventType,
      "only_opensea" : "false",
      collection_slug: slug,
      limit: 300,
    }

    if (timeBefore) {
      queryFilter.occurred_before = timeBefore;
    }
    // console.log(queryFilter);
    const events = await fetchEventsWithRetry(queryFilter);
    if (events.length == 0) {
      console.log('no more', events.length)
      break;
    }

    if (lastEvent && lastEvent.id == events[events.length - 1].id) {
      console.log('no more', 'is same')
      break;
    }

    totalEvents += events.length;
    lastEvent = events[events.length - 1]
    await parseAndSave(slug, eventType, events);
    timeBefore = moment(lastEvent.created_date).unix();
    console.log(slug, timeBefore, eventType, totalEvents)
  }
}

async function fetchCollection(collection) {
  const { slug } = collection;
  const collectionKey = [slug, 'collection', 'events'].join('-');
  if (status[collectionKey]) {
    console.log(slug, 'fetched');
    return;
  }
  await Promise.all([
    fetchCollectionAllEvents(slug),
    fetchCollectionAllEvents(slug, 'successful'),
  ]);
  console.log('all done', slug)
  await setValue(collectionKey, 1);
}


// fetchCollectionAllEvents({
//   slug: 'mekaverse',
//   asset_contract_address: '0x9a534628b4062e123ce7ee2222ec20b86e16ca8f'
// });


(async () => {
    let proccesed = 0;
    for (let index = 0; index < topCollections.length; index++) {
      const topCollection = topCollections[index];
      if (topCollection.stats.totalSupply > 20000 && ['lostpoets','adam-bomb-squad', 'emblem-vault'].indexOf(topCollection.slug) == -1) {
        console.log('skip')
        continue;
      }
      if (['decentraland-wearables', 'cryptokitties', 'decentraland', 'parallelalpha'].indexOf(topCollection.slug) > -1) {
        continue;
      }
      await fetchCollection(topCollection);
      proccesed++;
      console.log({
        proccesed,
        total: topCollections.length
      })
    }
})();