const { Asset, Event } = require('./db');
const topCollections = require("./topCollection200.json");
const { getTokenWithRarity } = require('./utils/rarity');
const fs = require('fs');
const { createObjectCsvWriter: createCsvWriter } = require('csv-writer');

const MINT_ADDRESS = '0x0000000000000000000000000000000000000000';

async function saveFile(dataRows, dataFile) {
  const firstRow = dataRows[0];
  const header = Object.keys(firstRow).map(_ => {
    return {
      id: _,
      title: _
    }
  }).filter(_ => _.id != 'TOKEN_ID');
  header.unshift({
    id: 'TOKEN_ID',
    title: 'TOKEN_ID'
  })
  const csvWriter = createCsvWriter({
    path: dataFile,
    header: header
  });
  await csvWriter.writeRecords(dataRows)
  console.log('rows', dataRows.length, firstRow)
}

async function runKsTest(slug) {
  try {
    var exec = require("child_process").exec;
    const comand = `python3 ks_test.py custom ${slug}`;
    console.log("run", comand);
    exec(
      comand,
      {
        cwd: __dirname + "/analytics/",
      },
      function (error, stdout, stderr) {
        stdout.on("data", (buf) => console.log(buf.toString()));
      }
    );
  } catch (e) {}
}

async function generateTokenData(collection) {

  const datasetbaseDir = `./dataset/${collection.slug}`;
  const dataFile = `${datasetbaseDir}/minting.csv`

  let allTokens = await Asset.findAll({
    where: {
      collection: collection.slug
    },
    raw: true
  });

  allTokens = allTokens
    .map((_) => {
      _.traits = JSON.parse(_.traits);
      return _;
    })
    .filter((_) => _.traits.length);

  if (allTokens.length == 0) {
    console.log('traits is empty')
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
    return
  }

  const tokenRarityMap = {};

  const tokensWithRarity = getTokenWithRarity(allTokens);
  tokensWithRarity.forEach((_) => {
    tokenRarityMap[_.token_id] = {
      rarity_rank: _.rarity_rank,
      rarity_score: _.rarity_score
    }
  })

  const allEvents = await Event.findAll({
    where: {
      event_type: 'transfer',
      collection_slug: collection.slug
    },
    raw: true
  });

  const allSaleEvents = await Event.findAll({
    where: {
      event_type: 'successful',
      collection_slug: collection.slug
    },
    raw: true
  });

  const fetchedTokens = allTokens.filter(_ => _.fetched == 1)
  const mintEvents = allEvents.filter(_ => _.from_account &&  _.from_account == MINT_ADDRESS)

  console.log({
    slug: collection.slug,
    fetchedTokens : fetchedTokens.length,
    allEvents: allEvents.length,  
    mintEvents: mintEvents.length, 
    allTokens: allTokens.length,
    allSaleEvents: allSaleEvents.length
  });


  if (!fs.existsSync(datasetbaseDir)) {
    fs.mkdirSync(datasetbaseDir);
  }

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
    await saveFile(mintingRows, dataFile)
    runKsTest(collection.slug);
  }

  if (allSaleEvents.length) {
    const saleWithRarity = allSaleEvents.map(item => {
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
      return row
    }).filter(_ => _.rank)

    await saveFile(saleWithRarity, `${datasetbaseDir}/sales.csv`)
  }
}


async function main() {
    for (let index = 0; index < topCollections.length; index++) {
      const topCollection = topCollections[index];
      if (topCollection.stats.totalSupply > 20000 && ['lostpoets','adam-bomb-squad', 'emblem-vault'].indexOf(topCollection.slug) == -1) {
        console.log('skip')
        continue;
      }
      if (['decentraland-wearables', 'cryptokitties', 'decentraland', 'parallelalpha'].indexOf(topCollection.slug) > -1) {
        continue;
      }
      await generateTokenData(topCollection);
    }
}


module.exports = {
  main,
  generateTokenData,
};
