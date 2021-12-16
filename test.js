const axios = require('axios');

(async () => {

    console.log(
      (
        await axios.get(
          "https://api.opensea.io/api/v1/events?asset_contract_address=0x61e6494d934b594d0634f292e13846639b6f1927&token_id=3635&event_type=successful&only_opensea=false&offset=0&limit=200",
          {
            headers: {
              "User-Agent": "curl/1.4.3",
              "X-API-KEY": "7c94683799a34c61b89051a5e58ad676",
            },
          }
        )
      ).data
    );
})();