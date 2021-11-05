const { fetchEventsWithRetry } = require("./lib/opensea");
const topCollections = require("./topCollection200.json");
const { Asset, Event } = require("./db");
const status = require("./status.json");
const fs = require("fs");

async function saveEvents(events) {
  const parsed = events.map((_) => {
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
  console.log(parsed.length);
  const results = await Event.bulkCreate(parsed, {
    ignoreDuplicates: true,
  });
}

async function findTokenAndFetch(collection) {
  const unfetchedTokens = await Asset.findAll({
    where: {
      collection: collection.slug,
      fetched: 0,
    },
    order: [
      ["id", "DESC"],
    ],
    limit: 16,
  });

  if (unfetchedTokens.length == 0) {
    console.log('all fetched', collection.slug)
    return;
  }

  try {
    let pendingTasks = []
    for (let index = 0; index < unfetchedTokens.length; index++) {
      const unfetchedToken = unfetchedTokens[index];

      pendingTasks.push(fetchEventsWithRetry({
        event_type: "transfer",
        asset_contract_address: unfetchedToken.asset_contract,
        token_id: unfetchedToken.token_id,
        limit: 200,
      }))

      pendingTasks.push(fetchEventsWithRetry({
        event_type: "successful",
        asset_contract_address: unfetchedToken.asset_contract,
        token_id: unfetchedToken.token_id,
        limit: 200,
      }))
    }
    // const events = await fetchEventsWithRetry({
    //   event_type: "transfer",
    //   asset_contract_address: unfetchedToken.asset_contract,
    //   token_id: unfetchedToken.token_id,
    //   limit: 200,
    // });
    // await saveEvents(events);
    // await unfetchedToken.update({
    //   fetched: 1,
    // });
    const allResults = await Promise.all(pendingTasks);
    for (let index = 0; index < allResults.length; index++) {
      const events = allResults[index];
      await saveEvents(events);
      const unfetchedToken = unfetchedTokens[index];
      if (unfetchedToken) {
        await unfetchedToken.update({
          fetched: 1,
        });
      }
    }
  } catch (e) {
    console.log(e)
  }
  console.log(collection.slug, unfetchedTokens.length);
  // setTimeout(findTokenAndFetch, 700);
  return await findTokenAndFetch(collection);
}

// findTokenAndFetch();

; (async () => {

  const needCollections = topCollections.filter((a, index) => index > 172).filter(_ => new Date(_.createdDate).getTime() > new Date('2021-01-01 00:00').getTime())
  for (let index = 0; index < needCollections.length; index++) {
    const topCollection = needCollections[index];
    if (topCollection.stats.totalSupply > 20000 && ['lostpoets', 'adam-bomb-squad', 'emblem-vault'].indexOf(topCollection.slug) == -1) {
      console.log('skip')
      continue;
    }
    if (['decentraland-wearables', 'cryptokitties', 'decentraland', 'parallelalpha'].indexOf(topCollection.slug) > -1) {
      continue;
    }

    await findTokenAndFetch(topCollection);
  }
})();
