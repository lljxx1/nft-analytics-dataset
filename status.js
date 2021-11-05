const { Asset, Event } = require("./db");

(async() => {
    console.log({
      //assets: await Asset.count(),
      //assets_fetched: await Asset.count({
      //    where: {
      //        fetched: 1
      //    }
      //}),
      events: await Event.count(),
    });
})();
