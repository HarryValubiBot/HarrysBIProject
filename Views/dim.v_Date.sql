CREATE   VIEW [dim].[v_Date] AS SELECT DISTINCT
  date AS [Date],
  DATEPART(year, date) AS [Year],
  DATEPART(quarter, date) AS [Quarter],
  DATEPART(month, date) AS [Month],
  DATEPART(day, date) AS [Day]
FROM
  stg.invoices
GO
