CREATE   VIEW [dim].[v_Product] AS SELECT
  ProductNo AS [ProductNo],
  COALESCE(ProductName, '') AS [ProductName]
FROM
  stg.Products
GO
