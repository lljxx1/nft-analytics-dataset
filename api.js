const express = require("express");
const compression = require("compression");
const cors = require("cors");
const app = express();
const { createModel } = require("./db");
const { getCollectionData } = require("./utils/api");

app.use(cors());
app.use(compression());

app.get("/api/getCollection", async (req, res) => {
  try {
    const { query } = req;
    const startTime = Date.now();
    const data = await getCollectionData(
      {
        slug: query.slug,
      },
      query.bucket
    );
    const spendTime = Date.now() - startTime;
    res.json({
      spendTime,
      result: data,
    });
  } catch (e) {
    res.json({
      error: 1,
      msg: e.toString(),
    });
  }
});

app.use(require("morgan")("dev"));

app.get("/api/getAllCollection", async (req, res) => {
  try {
    const startTime = Date.now();
    const allTypes = ["topCollection200", "collections24"];
    const overview = [];
    for (let index = 0; index < allTypes.length; index++) {
      const allType = allTypes[index];
      const task = require(`./${allType}.json`);
      const testReport = require(`./${allType}-withtest.json`);
      task.forEach((_) => {
        const hasReport = testReport.find((c) => _.slug == c.slug);
        if (hasReport)
          overview.push({
            name: _.name,
            logo: _.logo,
            slug: _.slug,
            bucket: allType == "topCollection200" ? "" : allType,
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
              .split(":")
              .join("")
              .split(" ")
              .join("-")}`,
          });
      });
    }

    const spendTime = Date.now() - startTime;
    res.json({
      spendTime,
      collections: overview,
    });
  } catch (e) {
    res.json({
      error: 1,
      msg: e.toString(),
    });
  }
});

// report page
app.use("/report", express.static("visualization"));

app.get("*", async (req, res) => {
  res.send("Hello");
});

app.listen(8082);
