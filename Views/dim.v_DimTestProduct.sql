CREATE   VIEW [dim].[v_DimTestProduct] AS SELECT ProductID AS [ProductKey], ProductName AS [ProductName], Brand AS [Brand] FROM stg.Products
GO
