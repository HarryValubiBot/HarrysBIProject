
    CREATE   PROCEDURE [dim].[sp_Customer]
    AS
    BEGIN
        SET NOCOUNT ON;

        DECLARE @MaxSK BIGINT;
        SELECT @MaxSK = MaxKey FROM [KeyVault].[SurrogateKeys]
            WHERE TableName = N'Customer';
        IF @MaxSK IS NULL
        BEGIN
            SET @MaxSK = ISNULL(
                (SELECT MAX([SK_Customer]) FROM [dim].[Customer]), 0);
            MERGE [KeyVault].[SurrogateKeys] AS kv
            USING (SELECT N'Customer' AS TableName) AS src
                ON kv.TableName = src.TableName
            WHEN NOT MATCHED THEN
                INSERT (TableName, MaxKey) VALUES (N'Customer', @MaxSK);
        END

        INSERT INTO [dim].[Customer]
            ([SK_Customer], [CustomerNo], [CustomerName], [DW_Created], [DW_Updated])
        SELECT
            @MaxSK + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
            src.[CustomerNo], src.[CustomerName],
            GETDATE(), GETDATE()
        FROM [dim].[v_Customer] src
        WHERE NOT EXISTS (
            SELECT 1 FROM [dim].[Customer] t
            WHERE t.[CustomerNo] = src.[CustomerNo]
        );

        UPDATE t SET t.[CustomerName] = src.[CustomerName], t.[DW_Updated] = GETDATE()
        FROM [dim].[Customer] t
        INNER JOIN [dim].[v_Customer] src ON t.[CustomerNo] = src.[CustomerNo];

        UPDATE [KeyVault].[SurrogateKeys]
        SET MaxKey = ISNULL(
            (SELECT MAX([SK_Customer]) FROM [dim].[Customer]), MaxKey)
        WHERE TableName = N'Customer';
    END
    
GO
