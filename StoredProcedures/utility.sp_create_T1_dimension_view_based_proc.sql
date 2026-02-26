
CREATE   PROCEDURE utility.sp_create_T1_dimension_view_based_proc
    @Target_Schema NVARCHAR(128),
    @Target_Table_Name NVARCHAR(128),
    @Source_View_Schema NVARCHAR(128),
    @Source_View_Name NVARCHAR(128),
    @Switch_Schema NVARCHAR(128) = 'switch',
    @BKs NVARCHAR(MAX),
    @Include_DW_ValidFrom BIT = 0,
    @DeleteObjects BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @sql NVARCHAR(MAX);
    DECLARE @FullTargetTable NVARCHAR(256) = QUOTENAME(@Target_Schema) + '.' + QUOTENAME(@Target_Table_Name);
    DECLARE @FullSourceView NVARCHAR(256) = QUOTENAME(@Source_View_Schema) + '.' + QUOTENAME(@Source_View_Name);
    DECLARE @ProcName NVARCHAR(256) = QUOTENAME(@Target_Schema) + '.' + QUOTENAME('sp_' + @Target_Table_Name);
    
    -- If DeleteObjects = 1, drop everything and return
    IF @DeleteObjects = 1
    BEGIN
        SET @sql = 'IF OBJECT_ID(''' + @ProcName + ''', ''P'') IS NOT NULL DROP PROCEDURE ' + @ProcName;
        EXEC sp_executesql @sql;
        SET @sql = 'IF OBJECT_ID(''' + @FullTargetTable + ''', ''U'') IS NOT NULL DROP TABLE ' + @FullTargetTable;
        EXEC sp_executesql @sql;
        SET @sql = 'IF OBJECT_ID(''' + QUOTENAME(@Switch_Schema) + '.' + QUOTENAME(@Target_Table_Name) + ''', ''U'') IS NOT NULL DROP TABLE ' + QUOTENAME(@Switch_Schema) + '.' + QUOTENAME(@Target_Table_Name);
        EXEC sp_executesql @sql;
        SET @sql = 'IF OBJECT_ID(''' + @FullSourceView + ''', ''V'') IS NOT NULL DROP VIEW ' + @FullSourceView;
        EXEC sp_executesql @sql;
        -- Remove surrogate key entry
        DELETE FROM KeyVault.SurrogateKeys WHERE TableName = @Target_Schema + '.' + @Target_Table_Name;
        RETURN;
    END
    
    -- Get columns from the source view
    DECLARE @cols TABLE (col_name NVARCHAR(128), data_type NVARCHAR(128), max_length INT, is_nullable BIT);
    SET @sql = 'SELECT c.COLUMN_NAME, c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH, CASE WHEN c.IS_NULLABLE = ''YES'' THEN 1 ELSE 0 END FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA = ''' + @Source_View_Schema + ''' AND c.TABLE_NAME = ''' + @Source_View_Name + ''' ORDER BY c.ORDINAL_POSITION';
    INSERT INTO @cols EXEC sp_executesql @sql;
    
    -- Build column definitions for the target table
    DECLARE @colDefs NVARCHAR(MAX) = '';
    DECLARE @colList NVARCHAR(MAX) = '';
    DECLARE @cname NVARCHAR(128), @ctype NVARCHAR(128), @cmax INT, @cnull BIT;
    DECLARE col_cursor CURSOR FOR SELECT col_name, data_type, max_length, is_nullable FROM @cols;
    OPEN col_cursor;
    FETCH NEXT FROM col_cursor INTO @cname, @ctype, @cmax, @cnull;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @colDefs = @colDefs + ', ' + QUOTENAME(@cname) + ' ' + 
            CASE 
                WHEN @ctype IN ('nvarchar','varchar') AND @cmax > 0 THEN @ctype + '(' + CAST(@cmax AS NVARCHAR) + ')'
                WHEN @ctype IN ('nvarchar','varchar') AND (@cmax IS NULL OR @cmax = -1) THEN @ctype + '(MAX)'
                WHEN @ctype IN ('decimal','numeric') THEN @ctype + '(18,2)'
                ELSE @ctype
            END +
            CASE WHEN @cnull = 1 THEN ' NULL' ELSE ' NOT NULL' END;
        SET @colList = @colList + CASE WHEN @colList = '' THEN '' ELSE ', ' END + QUOTENAME(@cname);
        FETCH NEXT FROM col_cursor INTO @cname, @ctype, @cmax, @cnull;
    END
    CLOSE col_cursor; DEALLOCATE col_cursor;
    
    -- Create target table with surrogate key
    SET @sql = 'IF OBJECT_ID(''' + @FullTargetTable + ''', ''U'') IS NOT NULL DROP TABLE ' + @FullTargetTable;
    EXEC sp_executesql @sql;
    
    SET @sql = 'CREATE TABLE ' + @FullTargetTable + ' (SK_' + @Target_Table_Name + ' BIGINT NOT NULL IDENTITY(1,1)' + @colDefs + ')';
    EXEC sp_executesql @sql;
    
    -- Initialize surrogate key tracker
    IF NOT EXISTS (SELECT 1 FROM KeyVault.SurrogateKeys WHERE TableName = @Target_Schema + '.' + @Target_Table_Name)
        INSERT INTO KeyVault.SurrogateKeys (TableName, MaxKey) VALUES (@Target_Schema + '.' + @Target_Table_Name, 0);
    
    -- Create the load stored procedure (SCD Type 1 - overwrite)
    SET @sql = 'CREATE OR ALTER PROCEDURE ' + @ProcName + ' AS BEGIN SET NOCOUNT ON; TRUNCATE TABLE ' + @FullTargetTable + '; INSERT INTO ' + @FullTargetTable + ' (' + @colList + ') SELECT ' + @colList + ' FROM ' + @FullSourceView + '; UPDATE KeyVault.SurrogateKeys SET MaxKey = ISNULL((SELECT MAX(SK_' + @Target_Table_Name + ') FROM ' + @FullTargetTable + '), 0) WHERE TableName = ''' + @Target_Schema + '.' + @Target_Table_Name + '''; END';
    EXEC sp_executesql @sql;
    
    PRINT 'Dimension ' + @FullTargetTable + ' created with SP ' + @ProcName;
END
    
GO
