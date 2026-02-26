CREATE TABLE [stg].[Employees]
(
    [EmployeeID] INT NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL,
    [LastName] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(200) NULL,
    [Department] NVARCHAR(100) NULL,
    [JobTitle] NVARCHAR(100) NULL,
    [HireDate] DATE NULL,
    [StoreID] INT NULL,
    [ManagerID] INT NULL,
    [Salary] DECIMAL(10, 2) NULL,
    [IsActive] BIT NULL
);
GO
