const { Asset, Event } = require('./db');
const topCollections = require("./topCollection200.json");
const { getTokenWithRarity } = require('./rarity');
// const kstest = require( '@stdlib/stats-kstest' );


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

  const mintEvents = allTokens.filter(_ => _.from_account &&  _.from_account == MINT_ADDRESS)
  console.log(allEvents.length,  mintEvents.length, allEvents[0], allTokens.length);
}

doAna({
  slug: 'mekaverse'
})
// (async () => {

//   for (let index = 0; index < topCollections.length; index++) {
//     const topCollection = topCollections[index];
//     if (topCollection.stats.totalSupply > 20000 && ['lostpoets','adam-bomb-squad', 'emblem-vault'].indexOf(topCollection.slug) == -1) {
//       console.log('skip')
//       continue;
//     }
//     if (['decentraland-wearables', 'cryptokitties', 'decentraland', 'parallelalpha'].indexOf(topCollection.slug) > -1) {
//       continue;
//     }

//     const token
  
//   }

//   Asset
// })();

// console.log(out = kstest(
//   [ 2.0, 1.0, 5.0, -5.0, 3.0, 0.5, 6.0 ]
//   , 'normal', 0.0, 1.0, {alternative: 'less'}))