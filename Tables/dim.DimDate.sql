CREATE TABLE [dim].[DimDate]
(
    [SK_DimDate] BIGINT IDENTITY(1, 1) NOT NULL,
    [Date] DATE NULL,
    [Year] INT NULL,
    [Month] INT NULL,
    [Day] INT NULL,
    [Quarter] INT NULL,
    [MonthName] NVARCHAR(30) NULL,
    [DayOfWeek] NVARCHAR(30) NULL,
    [WeekOfYear] INT NULL
);
GO
