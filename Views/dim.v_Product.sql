CREATE   VIEW [dim].[v_Product] AS SELECT
  ProductNo AS [ProductNo],
  COALESCE(ProductName, 'Unknown') AS [ProductName]
FROM
  stg.Products
GO
