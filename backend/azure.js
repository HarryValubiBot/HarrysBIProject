function normalizeAzureConfig(conn = {}) {
  const cfg = {
    server: String(conn.server || '').trim(),
    database: String(conn.database || '').trim(),
    user: String(conn.user || '').trim(),
    password: String(conn.password || ''),
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };
  if (!cfg.server || !cfg.database || !cfg.user || !cfg.password) throw new Error('azure_missing_connection_fields');
  return cfg;
}

async function openAzurePool(conn) {
  const mod = await import('mssql');
  const sql = mod.default || mod;
  const pool = await sql.connect(normalizeAzureConfig(conn));
  return pool;
}

export async function introspectAzure(conn) {
  const pool = await openAzurePool(conn);
  try {
    const tRes = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE='BASE TABLE'
        AND TABLE_SCHEMA IN ('fact', 'dim', 'bridge')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    const tables = [];
    for (const row of tRes.recordset) {
      const schema = row.TABLE_SCHEMA;
      const table = row.TABLE_NAME;
      const name = `${schema}.${table}`;

      const cRes = await pool.request()
        .input('s', schema)
        .input('t', table)
        .query(`
          SELECT c.COLUMN_NAME as name, c.DATA_TYPE as type,
                 CASE WHEN k.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as pk
          FROM INFORMATION_SCHEMA.COLUMNS c
          LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
            ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
           AND c.TABLE_NAME = k.TABLE_NAME
           AND c.COLUMN_NAME = k.COLUMN_NAME
           AND k.CONSTRAINT_NAME LIKE 'PK%'
          WHERE c.TABLE_SCHEMA=@s AND c.TABLE_NAME=@t
          ORDER BY c.ORDINAL_POSITION
        `);

      const fRes = await pool.request()
        .input('s', schema)
        .input('t', table)
        .query(`
          SELECT pc.name as [from],
                 CONCAT(SCHEMA_NAME(rt.schema_id), '.', rt.name) as toTable,
                 rc.name as [to]
          FROM sys.foreign_keys fk
          JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
          JOIN sys.tables pt ON fkc.parent_object_id = pt.object_id
          JOIN sys.columns pc ON fkc.parent_object_id = pc.object_id AND fkc.parent_column_id = pc.column_id
          JOIN sys.tables rt ON fkc.referenced_object_id = rt.object_id
          JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
          WHERE pt.name = @t AND SCHEMA_NAME(pt.schema_id) = @s
        `);

      tables.push({ name, columns: cRes.recordset, foreignKeys: fRes.recordset });
    }
    return tables;
  } finally {
    await pool.close();
  }
}

export async function queryAzure(conn, sqlText) {
  const pool = await openAzurePool(conn);
  try {
    const out = await pool.request().query(sqlText);
    return out.recordset;
  } finally {
    await pool.close();
  }
}

export { normalizeAzureConfig };
