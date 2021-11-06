
const fs = require("fs");
const parse = require("csv-parse");

const baseDir = fs.existsSync("/Users/fun/Downloads/dataset")
  ? "/Users/fun/Downloads/dataset"
  : "../dataset";

function readData(path) {
  const buffer = fs.readFileSync(path);
  return new Promise((resolve, reject) => {
    return parse(buffer, { columns: true, trim: true }, function (err, rows) {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

async function getTokenDetail(collection) {
  const mintFile = baseDir + `/${collection.slug}/minting.csv`;
  const salesFile = baseDir + `/${collection.slug}/sales.csv`;

  const mintings = await readData(mintFile);
  const sales = await readData(salesFile);

  // group by tokenId
  const saleByTokenId = sales.reduce((total, item) => {
    const { TOKEN_ID } = item;
    if (item.payment_token == "ETH") {
        total[TOKEN_ID] = total[TOKEN_ID] || [];
        total[TOKEN_ID].push(item);
        item.amount = item.price / 1e18;
    }
    return total;
  }, {});

  const mintingWithSalePrice = mintings
    .map((_) => {
      const { TOKEN_ID } = _;
      const sales = saleByTokenId[TOKEN_ID] || [];
      // check seller is minting account
      _.sales = sales.filter(
        (sale) => sale.seller == _.to_account );
      if (sales.length) {
        _.sale_price = sales[0].amount;
      } else {
        _.sale_price = 0;
      }
      return _;
    })
    .filter((_) => _.sales.length)
    .sort((a, b) => b.sale_price - a.sale_price);

  const groupByAccounts = mintingWithSalePrice.reduce((total, miting) => {
    const { to_account } = miting;
    total[to_account] = total[to_account] || [];
    total[to_account].push(miting);
    return total;
  }, {});

  const buyers = Object.keys(groupByAccounts)
    .map((_) => {
      return {
        account: _,
        mintings: groupByAccounts[_],
      };
    })
    .map((_) => {
      _.total_sale_amount = _.mintings.reduce(
        (total, item) => total + item.sale_price,
        0
      );
      return {
        account: _.account,
        total_sale_amount: _.total_sale_amount,
        mintings_count: _.mintings.length,
        mintings: _.mintings.map(_ => {
            return {
              TOKEN_ID: _.TOKEN_ID,
              rank: _.rank,
              sale_price: _.sale_price,
            };
        }).slice(0, 3)
      };
    })
    .sort((a, b) => b.total_sale_amount - a.total_sale_amount);

  const topBuyers = buyers.filter((_) => _.total_sale_amount > 1).slice(0, 50);
  return {
    topBuyers,
  };
}


async function main() {

    const args = process.argv.slice(2);
    const collecion = args[0] ? args[0] : "topCollection200";
    const allCollections = require(`../${collecion}.json`);
    const newOutputs = []

    for (let index = 0; index < allCollections.length; index++) {
      const allCollection = allCollections[index];
      const mintFile = baseDir + `/${allCollection.slug}/minting.csv`;
      if (!fs.existsSync(mintFile)) continue;

      const detail = await getTokenDetail(allCollection);
      newOutputs.push({
        ...detail,
        slug: allCollection.slug,
        name: allCollection.name
      });
    }

    fs.writeFileSync(
      `../reports/${collecion}-price.json`,
      JSON.stringify(newOutputs.map(_ => {
        _.topBuyers = _.topBuyers.map((_) => {
          delete _.pmintings;
          return _;
        });
        return _
      }), null, 2)
    );

    fs.writeFileSync(
      `../reports/${collecion}-price-detail.json`,
      JSON.stringify(newOutputs, null, 2)
    );
}


main();