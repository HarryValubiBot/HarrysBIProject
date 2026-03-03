CREATE TABLE [dim].[Product]
(
    [SK_Product] BIGINT NOT NULL,
    [ProductNo] NVARCHAR(255) NULL,
    [ProductName] NVARCHAR(255) NULL,
    [DW_Created] DATETIME2 NULL,
    [DW_Updated] DATETIME2 NULL
);
GO
