function safePart(x) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(x)) throw new Error(`unsafe_identifier:${x}`);
  return x;
}
function q(name) { return `[${safePart(name)}]`; }

export function buildDimViewSql({ viewName, sourceTable, columns, whereClause }) {
  const v = safePart(viewName);
  const src = safePart(sourceTable);
  if (!Array.isArray(columns) || !columns.length) throw new Error('columns_required');

  const sel = columns.map(c => {
    const from = q(c.from);
    const to = c.to && c.to !== c.from ? ` AS ${q(c.to)}` : '';
    return `${from}${to}`;
  }).join(',\n  ');

  const where = whereClause ? `\nWHERE ${whereClause}` : '';
  return `CREATE OR ALTER VIEW [dim].[v_${v}] AS\nSELECT\n  ${sel}\nFROM [stg].[${src}]${where};`;
}

export function buildGenerateDimExecSql({ generatorProc = 'dbo.GenerateT1Dimension', viewName }) {
  const base = safePart(viewName).replace(/^v_/, '');
  return `EXEC ${generatorProc} @SourceSchema='dim', @SourceView='v_${base}', @TargetSchema='dim', @TargetName='${base}';`;
}
