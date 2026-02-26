CREATE TABLE [stg].[Customers]
(
    [CustomerID] INT NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL,
    [LastName] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(200) NULL,
    [Phone] NVARCHAR(50) NULL,
    [DateOfBirth] DATE NULL,
    [Gender] NVARCHAR(10) NULL,
    [City] NVARCHAR(100) NULL,
    [State] NVARCHAR(100) NULL,
    [Country] NVARCHAR(100) NULL,
    [PostalCode] NVARCHAR(20) NULL,
    [CustomerSegment] NVARCHAR(50) NULL,
    [RegistrationDate] DATE NULL,
    [IsActive] BIT NULL
);
GO
