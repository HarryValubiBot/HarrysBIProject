CREATE TABLE [stg].[ProductCategories]
(
    [CategoryID] INT NOT NULL,
    [CategoryName] NVARCHAR(100) NOT NULL,
    [CategoryDescription] NVARCHAR(500) NULL,
    [ParentCategoryID] INT NULL,
    [IsActive] BIT NULL,
    [CreatedDate] DATETIME2 NULL
);
GO
