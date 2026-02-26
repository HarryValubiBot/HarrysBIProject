CREATE TABLE [dim].[DimTestProduct]
(
    [SK_DimTestProduct] BIGINT IDENTITY(1, 1) NOT NULL,
    [ProductKey] INT NOT NULL,
    [ProductName] NVARCHAR(200) NOT NULL,
    [Brand] NVARCHAR(100) NULL
);
GO
