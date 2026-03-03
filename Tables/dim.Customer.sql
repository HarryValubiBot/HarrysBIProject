CREATE TABLE [dim].[Customer]
(
    [SK_Customer] BIGINT NOT NULL,
    [CustomerNo] NVARCHAR(255) NULL,
    [CustomerName] NVARCHAR(255) NULL,
    [DW_Created] DATETIME2 NULL,
    [DW_Updated] DATETIME2 NULL
);
GO
