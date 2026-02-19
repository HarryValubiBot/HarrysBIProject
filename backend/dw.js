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

export function buildT1DimensionProcSql({
  targetSchema = 'dim',
  targetTableName,
  sourceViewSchema = 'dim',
  sourceViewName,
  switchSchema = 'switch',
  bks,
  includeDwValidFrom = 0,
  deleteObjects = 0,
}) {
  const tSchema = safePart(targetSchema);
  const tTable = safePart(targetTableName);
  const sSchema = safePart(sourceViewSchema);
  const sView = safePart(sourceViewName);
  const swSchema = safePart(switchSchema);
  const bksSafe = String(bks || '').replace(/'/g, "''");

  return `EXEC [utility].[sp_create_T1_dimension_view_based_proc]\n` +
    `  @Target_Schema='${tSchema}',\n` +
    `  @Target_Table_Name='${tTable}',\n` +
    `  @Source_View_Schema='${sSchema}',\n` +
    `  @Source_View_Name='${sView}',\n` +
    `  @Switch_Schema='${swSchema}',\n` +
    `  @BKs='${bksSafe}',\n` +
    `  @Include_DW_ValidFrom=${includeDwValidFrom ? 1 : 0},\n` +
    `  @DeleteObjects=${deleteObjects ? 1 : 0};`;
}
