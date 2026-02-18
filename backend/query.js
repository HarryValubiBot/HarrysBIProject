function safeId(x) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(x)) throw new Error(`unsafe_identifier:${x}`);
  return x;
}

export function buildAggregateSql({ factTable, dimTable, dimJoinFrom, dimJoinTo, xColumn, yColumn, agg = 'SUM', limit = 200 }) {
  const f = safeId(factTable);
  const d = safeId(dimTable);
  const jf = safeId(dimJoinFrom);
  const jt = safeId(dimJoinTo);
  const x = safeId(xColumn);
  const y = safeId(yColumn);
  const fn = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'].includes(String(agg).toUpperCase()) ? String(agg).toUpperCase() : 'SUM';
  const lim = Math.max(1, Math.min(1000, Number(limit || 200)));

  return `SELECT d.${x} AS label, ${fn}(f.${y}) AS value\nFROM ${f} f\nJOIN ${d} d ON f.${jf} = d.${jt}\nGROUP BY d.${x}\nORDER BY value DESC\nLIMIT ${lim}`;
}
