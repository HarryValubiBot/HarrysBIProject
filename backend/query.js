function safePart(x) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(x)) throw new Error(`unsafe_identifier:${x}`);
  return x;
}

function safeId(x) {
  const parts = String(x).split('.');
  if (parts.length > 2) throw new Error(`unsafe_identifier:${x}`);
  return parts.map(safePart).join('.');
}

function qIdent(x) {
  return safeId(x).split('.').map(p => `[${p}]`).join('.');
}

export function buildAggregateSql({ connType = 'sqlite', factTable, dimTable, dimJoinFrom, dimJoinTo, xColumn, yColumn, agg = 'SUM', limit = 200 }) {
  const f = qIdent(factTable);
  const d = qIdent(dimTable);
  const jf = qIdent(dimJoinFrom).replace(/^[^\.]+\./, '');
  const jt = qIdent(dimJoinTo).replace(/^[^\.]+\./, '');
  const x = qIdent(xColumn).replace(/^[^\.]+\./, '');
  const y = qIdent(yColumn).replace(/^[^\.]+\./, '');
  const fn = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'].includes(String(agg).toUpperCase()) ? String(agg).toUpperCase() : 'SUM';
  const lim = Math.max(1, Math.min(1000, Number(limit || 200)));

  if (connType === 'azure') {
    return `SELECT TOP ${lim} d.${x} AS label, ${fn}(f.${y}) AS value\nFROM ${f} f\nJOIN ${d} d ON f.${jf} = d.${jt}\nGROUP BY d.${x}\nORDER BY value DESC`;
  }

  return `SELECT d.${x} AS label, ${fn}(f.${y}) AS value\nFROM ${f} f\nJOIN ${d} d ON f.${jf} = d.${jt}\nGROUP BY d.${x}\nORDER BY value DESC\nLIMIT ${lim}`;
}
