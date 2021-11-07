
const { createObjectCsvWriter: createCsvWriter } = require("csv-writer");
const fs = require('fs');

async function saveFile(dataRows, dataFile) {
  const firstRow = dataRows[0];
  const header = Object.keys(firstRow)
    .map((_) => {
      return {
        id: _,
        title: _,
      };
    })
    .filter((_) => _.id != "name");
  header.unshift({
    id: "name",
    title: "name",
  });
  const csvWriter = createCsvWriter({
    path: dataFile,
    header: header,
  });
  await csvWriter.writeRecords(dataRows);
  console.log("rows", dataRows.length, firstRow);
}

const allTypes = ["topCollection200", "collections24"];
const overview = []

for (let index = 0; index < allTypes.length; index++) {
  const allType = allTypes[index];
  const task = require(`./${allType}.json`);
  const testReport = require(`./${allType}-withtest.json`);
  console.log(task);

  task.forEach(_ => {
    const hasReport = testReport.find(c => _.slug == c.slug)
    if (hasReport)
      overview.push({
        name: _.name,
        logo: _.logo,
        slug: _.slug,
        createdDate: _.createdDate,
        opensea: `https://opensea.io/collection/${_.slug}`,
        floorPrice: _.floorPrice,
        totalVolume: _.stats.totalVolume.toFixed(0),
        totalSupply: _.stats.totalSupply,
        numOwners: _.stats.numOwners,
        marketCap: _.stats.marketCap,
        hasReport: hasReport && hasReport.ks_test_result.length,
        testResult: `${allType}.md#${_.name
          .toLowerCase()
          .split(':').join('')
          .split(" ")
          .join("-")}`,
      });
  })
}

const md = [];

md.push('# Opensea Collections')

md.push(`|\t${['#', 'Logo', 'Collection', 'totalVolume', 'totalSupply', 'numOwners', 'Detail'].join("|\t")}\t|`)


md.push(
  `|---|--------------|--------------|-------|-----------------------------------|---------------|-----------|`
);

overview.forEach((row, index) => {
    md.push(
      `|\t${[
        index + 1,
        `![](${row.logo}) `,
        `${row.name}`,
        row.totalVolume,
        row.totalSupply,
        row.numOwners,
        `[Opensea](${row.opensea})${
          row.hasReport ? `<br>[Ks-test](${row.testResult})` : ""
        }<br>[Dataset](https://fhirchina.com/dataset.tar.gz)`,
      ].join("|\t")}\t|`
    );
})


fs.writeFileSync("./reports/overview.md", md.join("\n"));


saveFile(overview, "./overview.csv");