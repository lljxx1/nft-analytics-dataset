function doAnalyticsForAttributes(tokens) {
  const allTraitsCounts = {};
  tokens.filter(_ => _).forEach((token) => {
    if (token.traits) {
      token.traits.forEach((_) => {
        allTraitsCounts[_.trait_type] = allTraitsCounts[_.trait_type] || {};
        allTraitsCounts[_.trait_type][_.value] =
          allTraitsCounts[_.trait_type][_.value] || 0;
        allTraitsCounts[_.trait_type][_.value]++;
      });
    }
  });
  return allTraitsCounts;
}

function computeRarity(token, summaryTraits) {
  const weights = token.traits.map((_) => {
    const total = summaryTraits[_.trait_type][_.value];
    const percent = Math.floor((1 / total) * 1000000);
    // console.log("percent", percent, total);
    return {
      ..._,
      percent: percent,
      total,
    };
  });
  return {
    traits: weights,
    score: weights.reduce((total, t) => total + t.percent, 0),
  };
}

function getTokenWithRarity(tokens) {
  const summaryTraits = doAnalyticsForAttributes(tokens);
  return tokens.map((token) => {
    const rarity = computeRarity(token, summaryTraits);
    const newToken = {
      ...token,
      traits_breakdown: rarity.traits,
      rarity_score: rarity.score,
    };
    return newToken;
  }).sort(function (a, b) {
    return b.rarity_score - a.rarity_score;
  }).map((_, index) => {
    _.rarity_rank = index + 1;
    return _;
  });
}

module.exports = {
  getTokenWithRarity
}