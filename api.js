const express = require("express");
const compression = require("compression");
const cors = require("cors");
const app = express();
const { createModel } = require("./db");
const { getCollectionData } = require("./utils/api");
const { fetchCollection } = require("./utils/opensea");
const fs = require("fs");

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

app.get("/api/addCollection", async (req, res) => {
  const { query } = req;

  if (!query.slug) {
    return res.json({
      error: 1,
      msg: "link empty",
    });
  }

  const collectionDetail = await fetchCollection(query.slug);
  if (!collectionDetail) {
    return res.json({
      error: 1,
      msg: "fetch meta from opensea failed",
    });
  }

  const allCollections = getAllCollections();
  const taskFile = "./custom.json";
  const existsTask = JSON.parse(fs.readFileSync(taskFile, "utf-8"));
  const isInf = allCollections.find((_) => _.slug == query.slug);

  if (isInf) {
    return res.json({
      error: 1,
      msg: "exists",
    });
  }
  existsTask.push({
    name: collectionDetail.name,
    slug: query.slug,
    logo: collectionDetail.image_url,
    bucket: "custom",
    done: false,
    stats: {
      totalSupply: collectionDetail.stats.total_supply,
      totalVolume: collectionDetail.stats.total_volume,
      ...collectionDetail.stats,
    },
  });
  fs.writeFileSync(taskFile, JSON.stringify(existsTask));
  res.json({
      collectionDetail,
    tasks: existsTask.length,
  });
});

function getAllCollections() {
  const allTypes = ["topCollection200", "collections24", "custom"];
  const overview = [];
  for (let index = 0; index < allTypes.length; index++) {
    const allType = allTypes[index];

    const task = JSON.parse(fs.readFileSync(`./${allType}.json`, "utf-8"));
    const testReport = fs.existsSync(`./${allType}-withtest.json`)
      ? JSON.parse(fs.readFileSync(`./${allType}-withtest.json`, "utf-8"))
      : [];

   
    task.forEach((_) => {
      const hasReport = testReport.find((c) => _.slug == c.slug);
       const datasetbaseDir = `./dataset/${_.slug}`;
       const dataFile = `${datasetbaseDir}/minting.csv`;
        const ksTest = `${datasetbaseDir}/kstest.json`;
      if (hasReport || allType == "custom")
        overview.push({
          name: _.name,
          logo: _.logo,
          slug: _.slug,
          bucket: allType == "topCollection200" ? "" : allType,
          createdDate: _.createdDate,
          opensea: `https://opensea.io/collection/${_.slug}`,
          floorPrice: _.floorPrice,
          totalVolume: _.stats && _.stats.totalVolume.toFixed(0),
          totalSupply: _.stats && _.stats.totalSupply,
          numOwners: _.stats && _.stats.numOwners,
          marketCap: _.stats && _.stats.marketCap,
          hasReport: hasReport && hasReport.ks_test_result.length,
          isDone: hasReport ? true : fs.existsSync(ksTest),
          testResult: `${allType}.md#${_.name
            .toLowerCase()
            .split(":")
            .join("")
            .split(" ")
            .join("-")}`,
        });
    });
  }

  return overview;
}

app.get("/api/getAllCollection", async (req, res) => {
  try {
    const startTime = Date.now();
    const overview = getAllCollections();
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
