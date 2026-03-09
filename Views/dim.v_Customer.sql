CREATE   VIEW [dim].[v_Customer] AS SELECT
  CustomerNo AS [CustomerNo],
  COALESCE(CustomerName, '') AS [CustomerName]
FROM
  stg.customers
GO
