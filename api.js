const express = require("express");
const compression = require("compression");
const cors = require("cors");
const app = express();
const { createModel } = require("./db");
const { getCollectionData } = require("./utils/api");
const fs = require('fs');

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
    const allCollections = getAllCollections();
    const taskFile = "./custom.json";
    const existsTask = JSON.parse(fs.readFileSync(taskFile, "utf-8"));
    const isInf = allCollections.find((_) => _.slug == query.slug);
    if (!query.slug && !query.name) {
         return res.json({
           error: 1,
           msg: "slug, name empty",
         });
    }
      if (isInf) {
        return res.json({
          error: 1,
          msg: "exists",
        });
      }
    existsTask.push({
        name: query.name,
        slug: query.slug,
        bucket: "custom",
        done: false,
    });
    fs.writeFileSync(taskFile, JSON.stringify(existsTask));
    res.json({
      tasks: existsTask.length
    });
})


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
         if (hasReport || allType == "custom")
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
