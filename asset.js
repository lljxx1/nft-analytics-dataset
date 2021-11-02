const { fetchCollectionTokens } = require("./lib/opensea");
const topCollections = require("./topCollection200.json");
const { Asset } = require('./db');
const status = require("./status.json");
const fs = require('fs');

async function setValue(key, value) {
    status[key] = value;
    fs.writeFileSync("./status.json", JSON.stringify(status, null, 2));
}

async function savePageResult(contract, pageResults) {
  for (let index = 0; index < pageResults.length; index++) {
    try {
        let pageResult = pageResults[index];
      let pageKey = [contract, "page", pageResult.page].join("-");

      const assets = pageResult.assets;
      const parsed = assets.map((_) => {
        return {
          id: _.id,
          fetched: 0,
          collection: _.collection.slug,
          asset_contract: _.asset_contract.address,
          token_id: _.token_id,
          num_sales: _.num_sales,
          image_url: _.image_url,
          name: _.name,
          permalink: _.permalink,
          owner: _.owner.address,
          traits: JSON.stringify(_.traits),
        };
      });
      console.log(parsed.length);
      const results = await Asset.bulkCreate(parsed, {
        ignoreDuplicates: true,
      });

      await setValue(pageKey, 1);
      // console.log(results);
    } catch (e) {
      console.log(e);
    }
  }
}

async function getCollectionAllTokens(contract) {
  let pageNo = 1;
  let allAssets = [];
  let batchLimit = 2;
  let batchTasks = [];
  let startTime = Date.now();

  async function flush() {
    let hasZero = false;
    const results = await Promise.all(batchTasks);
    let pageResults = []
    results.forEach((page) => {
      hasZero = page.assets.length == 0;
      pageResults.push(page);
    });
    try {
        await savePageResult(contract, pageResults);
    } catch (e) {

    }
    batchTasks = [];
    // console.log(allAssets.length, results.length)
    return hasZero;
  }

  for (let index = 0; index < 1000; index++) {
    let hasZero = false;
    let pageKey = [contract, "page", pageNo].join('-');
    if (status[pageKey]) continue;
    batchTasks.push(fetchCollectionTokens(contract, pageNo));
    if (batchTasks.length > batchLimit) {
      try {
        hasZero = await flush();
      } catch (e) {
        console.log(e.toString());
        break;
      }
    }

    if (hasZero) {
      console.log("no more page");
      break;
    }

    pageNo++;
  }

  if (batchTasks.length) await flush();
  const spendTime = Date.now() - startTime;
  console.log("spendTime", spendTime / 1000);
  return {
    spendTime,
    assets: allAssets,
  };
}

async function fetchCollection(collection) {
    const { slug } = collection;
    const allTokens = await getCollectionAllTokens(slug);
    console.log(allTokens);
}

(async () => {
    for (let index = 0; index < topCollections.length; index++) {
      const topCollection = topCollections[index];
      if (topCollection.slug.indexOf('decentraland') > -1) {
        continue;
      }

      const collectionCount = await Asset.count({
        where: {
          collection: topCollection.slug
        }
      });

      console.log({
        name: topCollection.name,
        slug: topCollection.slug,
        collectionCount,
        totalSupply: topCollection.stats.totalSupply
      })
      // const collectionKey = [topCollection.slug, 'collection'].join('-');
      // if (status[collectionKey]) continue;
      // await fetchCollection(topCollection);
      // setValue(collectionKey, 1);
    }
})();