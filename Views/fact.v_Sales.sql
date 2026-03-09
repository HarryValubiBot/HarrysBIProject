
            CREATE   VIEW [fact].[v_Sales] AS
            WITH
  CleanInvoices AS (
    SELECT
      CustomerNo AS [CustomerNo],
      ProductNo AS [ProductNo],
      date AS [Date],
      TRY_CAST(Amount AS DECIMAL(18, 2)) AS [Amount]
    FROM
      stg.invoices
    WHERE
      Amount IS NOT NULL
  )
            SELECT 
                src.*,
                ISNULL(d_Customer_0.[SK_Customer], -1) AS [Customer_SK], ISNULL(d_Product_1.[SK_Product], -1) AS [Product_SK], ISNULL(d_Date_2.[SK_Date], -1) AS [Date_SK]
            FROM (
                SELECT
  ci.[Amount] AS [Amount],
  ci.[CustomerNo] AS [CustomerNo],
  ci.[ProductNo] AS [ProductNo],
  ci.[Date] AS [Date]
FROM
  CleanInvoices ci
            ) src
            
                    LEFT JOIN [dim].[Customer] d_Customer_0
                        ON ISNULL(NULLIF(CAST(src.[CustomerNo] AS NVARCHAR(MAX)), ''), 'N/A') = d_Customer_0.[CustomerNo]
                 
                    LEFT JOIN [dim].[Product] d_Product_1
                        ON ISNULL(NULLIF(CAST(src.[ProductNo] AS NVARCHAR(MAX)), ''), 'N/A') = d_Product_1.[ProductNo]
                 
                    LEFT JOIN [dim].[Date] d_Date_2
                        ON ISNULL(NULLIF(CAST(src.[Date] AS NVARCHAR(MAX)), ''), 'N/A') = d_Date_2.[Date]
                
        
GO
