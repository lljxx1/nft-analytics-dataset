const fs = require('fs');

const args = process.argv.slice(2);
const collecion = args[0] ? args[0] : "topCollection200";
const testReport = require(`./${collecion}-withtest.json`);

const summaryBlock = `
# ${collecion}
- collections: ${testReport.length}
`;

const detailBlock = testReport
  .map((_) => {
    _.above = _.ks_test_result
      .map((_) => {
        _.min = _.score.split("-")[1];
        _.min = _.min ? parseInt(_.min) : null;
        return _;
      })
      .filter((_) => _.min && _.min > 15);
    return _;
  })
  .filter((_) => _.above.length)
  .map((_) => {
    return {
      name: _.name,
      above: _.above,
      ks_test_result: JSON.stringify(_.ks_test_result),
      opensea: `https://opensea.io/collection/${_.slug}`,
    };
  })
  .map((_) => {
    return [
      `## ${_.name}`,
      `[opensea](${_.opensea})`,
      _.above
        .map((_) => {
          return [
            `### ${_.account}`,
            `- score: ${_.score}`,
            `- num_minted: ${_.num_minted}`,
            `- num_transactions: ${_.num_transactions}`,
            "``` json",
            JSON.stringify(_.lowest_list),
            "```",
            "\n",
          ].join("\n");
        })
        .join("\n"),
    ].join("\n");
  })
  .join("\n");

fs.writeFileSync(
  `./reports/${collecion}.md`,
  [summaryBlock, detailBlock].join("\n")
);