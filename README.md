
## Sample 
[topCollection200](reports/topCollection200.md)

## Usage

``` shell
# put the collections information in custom.json;
echo '[{"name": "Doodles", slug: "doodles-official"}]' > custom.json;

# init sqlite database
node init custom

# start fetch 
node fetchAsset.js custom

# generate ks-test
cd analytics
python3 ks_test.py custom

# generate markdon report
node genReport.js custom
```

## config.json
``` json
{
    "OPENSEA_API_KEYS": [
        "7c94683799a34c61b89051a5e58ad676",
        "fd19e5cba6e243719640f90f9f1f1d1e",
        "6a7ceb45f3c44c84be65779ad2907046",
        "acee0e72b69142dfaa445fe5310d9d70",
    ]
}
```