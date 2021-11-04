const { Asset, Event } = require('./db');
const topCollections = require("./topCollection200.json");
const { getTokenWithRarity } = require('./rarity');
// const kstest = require( '@stdlib/stats-kstest' );
const fs = require('fs');
const { createObjectCsvWriter: createCsvWriter } = require('csv-writer');

const MINT_ADDRESS = '0x0000000000000000000000000000000000000000';

async function doAna(collection) {
  let allTokens = await Asset.findAll({
    where: {
      collection: collection.slug
    },
    raw: true
  });

  allTokens = allTokens.map(_ => {
    _.traits = JSON.parse(_.traits)
    return _;
  });

  const tokensWithRarity = getTokenWithRarity(allTokens);
  const allEvents = await Event.findAll({
    where: {
      event_type: 'transfer',
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
    allTokens: allTokens.length
  });

  const datasetbaseDir = `./dataset/${collection.slug}`;
  if (!fs.existsSync(datasetbaseDir)) {
    fs.mkdirSync(datasetbaseDir);
  }


  const uniqueMintSet = new Set();
  const mintingRows = mintEvents.reduce((total, item)=> {
    const rarity = tokensWithRarity.find(_ => _.token_id == item.token_id);
    const row = {
      txid: item.transaction,
      to_account: item.to_account,
      TOKEN_ID: item.token_id,
      current_owner: item.owner,
      rank: rarity.rarity_rank,
      time: item.timestamp
    }

    if (!uniqueMintSet.has(item.token_id)) {
      total.push(row);
      uniqueMintSet.add(item.token_id);
    }
    return total;
  }, []);


  if (mintingRows.length) {
    const firstRow = mintingRows[0];
    
    const dataFile = `${datasetbaseDir}/minting.csv`
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
    console.log('rows', mintingRows.length)
    await csvWriter.writeRecords(mintingRows)
  }
}

// doAna({
//   slug: 'mekaverse'
// })

;(async () => {

  for (let index = 0; index < topCollections.length; index++) {
    const topCollection = topCollections[index];
    if (topCollection.stats.totalSupply > 20000 && ['lostpoets','adam-bomb-squad', 'emblem-vault'].indexOf(topCollection.slug) == -1) {
      console.log('skip')
      continue;
    }
    if (['decentraland-wearables', 'cryptokitties', 'decentraland', 'parallelalpha'].indexOf(topCollection.slug) > -1) {
      continue;
    }

    await doAna(topCollection);
  
  }

})();

// console.log(out = kstest(
//   [ 2.0, 1.0, 5.0, -5.0, 3.0, 0.5, 6.0 ]
//   , 'normal', 0.0, 1.0, {alternative: 'less'}))