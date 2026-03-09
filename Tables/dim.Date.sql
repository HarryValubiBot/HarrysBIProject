CREATE TABLE [dim].[Date]
(
    [SK_Date] BIGINT NOT NULL,
    [Date] DATE NULL,
    [Year] INT NULL,
    [Quarter] INT NULL,
    [Month] INT NULL,
    [Day] INT NULL,
    [DW_Created] DATETIME2 NULL,
    [DW_Updated] DATETIME2 NULL
);
GO
