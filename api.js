const express = require("express");
const compression = require("compression");
const cors = require("cors");
const app = express();
const { createModel } = require("./db");

const { getCollectionData } = require("./lib/api");

app.use(cors());
app.use(compression());

app.get("/api/getCollection", async (req, res) => {
  try {
      const { query } = req;
    const data = await getCollectionData(
      {
        slug: query.slug,
      },
      query.bucket
    );
    res.json(data);
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
