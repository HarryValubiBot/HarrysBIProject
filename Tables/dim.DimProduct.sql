CREATE TABLE [dim].[DimProduct]
(
    [SK_DimProduct] BIGINT IDENTITY(1, 1) NOT NULL,
    [ProductID] INT NOT NULL,
    [ProductName] NVARCHAR(200) NOT NULL,
    [ProductCode] NVARCHAR(50) NOT NULL,
    [Brand] NVARCHAR(100) NOT NULL,
    [UnitPrice] DECIMAL(18, 2) NOT NULL,
    [UnitCost] DECIMAL(18, 2) NULL,
    [Weight] DECIMAL(18, 2) NULL,
    [Color] NVARCHAR(50) NOT NULL,
    [Size] NVARCHAR(20) NOT NULL,
    [LaunchDate] DATE NULL,
    [DiscontinuedDate] DATE NULL,
    [IsActive] BIT NULL,
    [CategoryName] NVARCHAR(100) NOT NULL,
    [CategoryDescription] NVARCHAR(500) NOT NULL,
    [ParentCategoryID] INT NULL
);
GO
