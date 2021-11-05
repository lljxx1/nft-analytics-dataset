temp1
  .map((_) => temp2[temp2[_].node.__ref])
  .map((_) => ({ ..._, stats: temp2[_.stats.__ref] }));






  temp1.map(_ => {
    _.above = _.ks_test_result.map(_ => {
      _.min = _.score.split('-')[1]
      _.min =  _.min ? parseInt( _.min) : null;
      return _;
    }).filter(_ => _.min && _.min > 15)
    return _;
  }).filter(_ => _.above.length).map(_ => {
    return {
      name: _.name,
      above: _.above,
      ks_test_result: JSON.stringify(_.ks_test_result),
      opensea: `https://opensea.io/collection/${_.slug}`
    }
  })