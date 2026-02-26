CREATE TABLE [stg].[Products]
(
    [ProductID] INT NOT NULL,
    [ProductName] NVARCHAR(200) NOT NULL,
    [ProductCode] NVARCHAR(50) NOT NULL,
    [CategoryID] INT NOT NULL,
    [Brand] NVARCHAR(100) NULL,
    [UnitPrice] DECIMAL(10, 2) NOT NULL,
    [UnitCost] DECIMAL(10, 2) NULL,
    [Weight] DECIMAL(8, 2) NULL,
    [Color] NVARCHAR(50) NULL,
    [Size] NVARCHAR(20) NULL,
    [IsActive] BIT NULL,
    [LaunchDate] DATE NULL,
    [DiscontinuedDate] DATE NULL
);
GO
