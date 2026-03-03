CREATE   VIEW [dim].[v_Date] AS SELECT DISTINCT
  CAST([date] AS DATE) AS [DateKey],
  YEAR([date]) AS [Year],
  MONTH([date]) AS [Month],
  DAY([date]) AS [Day]
FROM
  stg.invoices
GO
