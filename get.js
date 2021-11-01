temp1
  .map((_) => temp2[temp2[_].node.__ref])
  .map((_) => ({ ..._, stats: temp2[_.stats.__ref] }));
