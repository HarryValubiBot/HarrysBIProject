CREATE TABLE [dim].[Date]
(
    [SK_Date] BIGINT NOT NULL,
    [DateKey] DATE NULL,
    [Year] INT NULL,
    [Month] INT NULL,
    [Day] INT NULL,
    [DW_Created] DATETIME2 NULL,
    [DW_Updated] DATETIME2 NULL
);
GO
