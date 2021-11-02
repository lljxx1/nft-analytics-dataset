const { Asset, Event } = require("./db");

// Asset.sync({ alter: true });
// Event.sync({ alter: true });

(async () => {
  const result = await Asset.update({
    fetched: 0,
  }, {
    where: {
      fetched: 1
    }
  });
  console.log(result)
})();
