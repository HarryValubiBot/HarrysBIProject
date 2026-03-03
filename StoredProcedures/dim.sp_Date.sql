
    CREATE   PROCEDURE [dim].[sp_Date]
    AS
    BEGIN
        SET NOCOUNT ON;

        DECLARE @MaxSK BIGINT;
        SELECT @MaxSK = MaxKey FROM [KeyVault].[SurrogateKeys]
            WHERE TableName = N'Date';
        IF @MaxSK IS NULL
        BEGIN
            SET @MaxSK = ISNULL(
                (SELECT MAX([SK_Date]) FROM [dim].[Date]), 0);
            MERGE [KeyVault].[SurrogateKeys] AS kv
            USING (SELECT N'Date' AS TableName) AS src
                ON kv.TableName = src.TableName
            WHEN NOT MATCHED THEN
                INSERT (TableName, MaxKey) VALUES (N'Date', @MaxSK);
        END

        INSERT INTO [dim].[Date]
            ([SK_Date], [DateKey], [Year], [Month], [Day], [DW_Created], [DW_Updated])
        SELECT
            @MaxSK + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
            src.[DateKey], src.[Year], src.[Month], src.[Day],
            GETDATE(), GETDATE()
        FROM [dim].[v_Date] src
        WHERE NOT EXISTS (
            SELECT 1 FROM [dim].[Date] t
            WHERE t.[DateKey] = src.[DateKey]
        );

        UPDATE t SET t.[Year] = src.[Year], t.[Month] = src.[Month], t.[Day] = src.[Day], t.[DW_Updated] = GETDATE()
        FROM [dim].[Date] t
        INNER JOIN [dim].[v_Date] src ON t.[DateKey] = src.[DateKey];

        UPDATE [KeyVault].[SurrogateKeys]
        SET MaxKey = ISNULL(
            (SELECT MAX([SK_Date]) FROM [dim].[Date]), MaxKey)
        WHERE TableName = N'Date';
    END
    
GO
