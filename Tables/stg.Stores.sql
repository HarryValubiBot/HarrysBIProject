CREATE TABLE [stg].[Stores]
(
    [StoreID] INT NOT NULL,
    [StoreName] NVARCHAR(200) NOT NULL,
    [StoreCode] NVARCHAR(20) NOT NULL,
    [StoreType] NVARCHAR(50) NULL,
    [City] NVARCHAR(100) NULL,
    [State] NVARCHAR(100) NULL,
    [Country] NVARCHAR(100) NULL,
    [Region] NVARCHAR(100) NULL,
    [Manager] NVARCHAR(200) NULL,
    [OpenDate] DATE NULL,
    [SquareFootage] INT NULL,
    [IsActive] BIT NULL
);
GO
