
        CREATE   PROCEDURE [fact].[usp_LoadSales]
        AS
        BEGIN
            SET NOCOUNT ON;
            
            -- Truncate and reload fact table
            TRUNCATE TABLE [fact].[Sales];
            
            INSERT INTO [fact].[Sales] ([Amount], [Customer_SK], [Product_SK], [Date_SK])
            SELECT 
                src.[Amount], ISNULL(d_Customer_0.[SK_Customer], -1) AS [Customer_SK], ISNULL(d_Product_1.[SK_Product], -1) AS [Product_SK], ISNULL(d_Date_2.[SK_Date], -1) AS [Date_SK]
            FROM (
                SELECT
  CAST(Amount AS DECIMAL(18, 2)) AS [Amount],
  CustomerNo AS [CustomerNo],
  ProductNo AS [ProductNo],
  CAST([date] AS DATE) AS [DateKey]
FROM
  stg.invoices
            ) src
            
                    LEFT JOIN [dim].[Customer] d_Customer_0
                        ON ISNULL(NULLIF(CAST(src.[CustomerNo] AS NVARCHAR(MAX)), ''), 'N/A') = d_Customer_0.[CustomerNo]
                 
                    LEFT JOIN [dim].[Product] d_Product_1
                        ON ISNULL(NULLIF(CAST(src.[ProductNo] AS NVARCHAR(MAX)), ''), 'N/A') = d_Product_1.[ProductNo]
                 
                    LEFT JOIN [dim].[Date] d_Date_2
                        ON ISNULL(NULLIF(CAST(src.[DateKey] AS NVARCHAR(MAX)), ''), 'N/A') = d_Date_2.[DateKey]
                ;
        END
        
GO
