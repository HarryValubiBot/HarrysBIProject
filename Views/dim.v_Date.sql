CREATE   VIEW [dim].[v_Date] AS SELECT DISTINCT
  date AS [Date]
FROM
  stg.invoices
GO
