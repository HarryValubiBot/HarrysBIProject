CREATE   VIEW [dim].[v_DimDate] AS SELECT DISTINCT CAST(SaleDate AS DATE) AS [Date], YEAR(SaleDate) AS [Year], MONTH(SaleDate) AS [Month], DAY(SaleDate) AS [Day], DATEPART(QUARTER, SaleDate) AS [Quarter], DATENAME(MONTH, SaleDate) AS [MonthName], DATENAME(WEEKDAY, SaleDate) AS [DayOfWeek], DATEPART(WEEK, SaleDate) AS [WeekOfYear] FROM stg.Sales
GO
