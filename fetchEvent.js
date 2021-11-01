const { fetchEventsWithRetry } = require("./lib/opensea");
const topCollections = require("./topCollection200.json");
const { Asset, Event } = require("./db");
const status = require("./status.json");
const fs = require("fs");

async function saveEvents(events) {
    const parsed = events.map((_) => {
    //  console.log(_)
      return {
        id: _.id,
        contract_address: _.contract_address,
        collection_slug: _.collection_slug,
        created_date: _.created_date,
        event_type: _.event_type,
        from_account: _.from_account ? _.from_account.address : null,
        to_account: _.to_account ? _.to_account.address : null,
        transaction: _.transaction.block_hash,
        transaction_from_account: _.transaction.from_account.address,
        transaction_to_account: _.transaction.to_account.address,
      };
    });
    console.log(parsed.length);
    const results = await Event.bulkCreate(parsed, {
      ignoreDuplicates: true,
    });
}

async function findTokenAndFetch() {
    const unfetchedTokens = await Asset.findAll({
        where: {
            fetched: 0
        },
        limit: 20
    });

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
          await unfetchedToken.update({
            fetched: 1,
          });
        }
    } catch(e) {}
    console.log(unfetchedTokens.length);
    setTimeout(findTokenAndFetch, 700);
}

findTokenAndFetch();