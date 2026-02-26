CREATE TABLE [stg].[Sales]
(
    [SaleID] INT NOT NULL,
    [SaleDate] DATETIME2 NOT NULL,
    [CustomerID] INT NULL,
    [ProductID] INT NOT NULL,
    [StoreID] INT NOT NULL,
    [EmployeeID] INT NULL,
    [Quantity] INT NOT NULL,
    [UnitPrice] DECIMAL(10, 2) NOT NULL,
    [Discount] DECIMAL(5, 2) NULL,
    [TotalAmount] DECIMAL(12, 2) NOT NULL,
    [PaymentMethod] NVARCHAR(50) NULL,
    [OrderNumber] NVARCHAR(50) NULL,
    [IsReturned] BIT NULL
);
GO
