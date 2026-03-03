
    CREATE   PROCEDURE [dim].[sp_Product]
    AS
    BEGIN
        SET NOCOUNT ON;

        DECLARE @MaxSK BIGINT;
        SELECT @MaxSK = MaxKey FROM [KeyVault].[SurrogateKeys]
            WHERE TableName = N'Product';
        IF @MaxSK IS NULL
        BEGIN
            SET @MaxSK = ISNULL(
                (SELECT MAX([SK_Product]) FROM [dim].[Product]), 0);
            MERGE [KeyVault].[SurrogateKeys] AS kv
            USING (SELECT N'Product' AS TableName) AS src
                ON kv.TableName = src.TableName
            WHEN NOT MATCHED THEN
                INSERT (TableName, MaxKey) VALUES (N'Product', @MaxSK);
        END

        INSERT INTO [dim].[Product]
            ([SK_Product], [ProductNo], [ProductName], [DW_Created], [DW_Updated])
        SELECT
            @MaxSK + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
            src.[ProductNo], src.[ProductName],
            GETDATE(), GETDATE()
        FROM [dim].[v_Product] src
        WHERE NOT EXISTS (
            SELECT 1 FROM [dim].[Product] t
            WHERE t.[ProductNo] = src.[ProductNo]
        );

        UPDATE t SET t.[ProductName] = src.[ProductName], t.[DW_Updated] = GETDATE()
        FROM [dim].[Product] t
        INNER JOIN [dim].[v_Product] src ON t.[ProductNo] = src.[ProductNo];

        UPDATE [KeyVault].[SurrogateKeys]
        SET MaxKey = ISNULL(
            (SELECT MAX([SK_Product]) FROM [dim].[Product]), MaxKey)
        WHERE TableName = N'Product';
    END
    
GO
