const { createModel  } = require("../db");
const { getTokenWithRarity } = require("./rarity");
const fs = require("fs");

const MINT_ADDRESS = "0x0000000000000000000000000000000000000000";

async function getCollectionData(collection, bucket = '') {
    const { Asset, Event } = createModel(bucket);
    const datasetbaseDir = __dirname + `/../dataset/${collection.slug}`;
    const dataFile = `${datasetbaseDir}/minting.csv`;
    let allTokens = await Asset.findAll({
        where: {
        collection: collection.slug,
        },
        raw: true,
    });
    allTokens = allTokens
        .map((_) => {
        _.traits = JSON.parse(_.traits);
        return _;
        })
        .filter((_) => _.traits.length);

  const tokenRarityMap = {};

  const tokensWithRarity = getTokenWithRarity(allTokens);
  tokensWithRarity.forEach((_) => {
    tokenRarityMap[_.token_id] = {
      rarity_rank: _.rarity_rank,
      rarity_score: _.rarity_score,
    };
  });

  const allEvents = await Event.findAll({
    where: {
      event_type: "transfer",
      collection_slug: collection.slug,
    },
    raw: true,
  });

  const allSaleEvents = await Event.findAll({
    where: {
      event_type: "successful",
      collection_slug: collection.slug,
    },
    raw: true,
  });

  const fetchedTokens = allTokens.filter((_) => _.fetched == 1);
  const mintEvents = allEvents.filter(
    (_) => _.from_account && _.from_account == MINT_ADDRESS
  );

  const rersult = {
    mintingRows: [],
    saleWithRarity: []
  };

  console.log({
    slug: collection.slug,
    fetchedTokens: fetchedTokens.length,
    allEvents: allEvents.length,
    mintEvents: mintEvents.length,
    allTokens: allTokens.length,
    allSaleEvents: allSaleEvents.length,
  });

//   if (!fs.existsSync(datasetbaseDir)) {
//     fs.mkdirSync(datasetbaseDir);
//   }

  const uniqueMintSet = new Set();
  const mintingRows = mintEvents
    .reduce((total, item) => {
      const rarity = tokenRarityMap[item.token_id];
      const row = {
        txid: item.transaction,
        to_account: item.to_account,
        TOKEN_ID: item.token_id,
        current_owner: item.owner,
        rank: rarity ? rarity.rarity_rank : null,
        time: item.timestamp,
      };
      if (!uniqueMintSet.has(item.token_id)) {
        total.push(row);
        uniqueMintSet.add(item.token_id);
      }
      return total;
    }, [])
    .filter((_) => _.rank);

  if (mintingRows.length) {
    rersult.mintingRows = mintingRows;
  }

  if (allSaleEvents.length) {
    const saleWithRarity = allSaleEvents
      .map((item) => {
        const rarity = tokenRarityMap[item.token_id];
        const row = {
          txid: item.transaction,
          seller: item.seller,
          winner_account: item.winner_account,
          TOKEN_ID: item.token_id,
          current_owner: item.owner,
          rank: rarity ? rarity.rarity_rank : null,
          time: item.timestamp,
          payment_token: item.payment_token,
          price: item.price,
        };
        return row;
      })
      .filter((_) => _.rank);

      rersult.saleWithRarity = saleWithRarity;
 }

  return rersult;
}


module.exports = {
  getCollectionData,
};