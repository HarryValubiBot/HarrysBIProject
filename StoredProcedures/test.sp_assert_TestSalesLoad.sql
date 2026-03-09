
        CREATE   PROCEDURE [test].[sp_assert_TestSalesLoad]
        AS
        BEGIN
            SET NOCOUNT ON;
            -- Assertion: All sales records have valid date keys
IF EXISTS (SELECT 1 FROM fact.Sales WHERE Date_SK IS NULL) THROW 50001, 'There are sales records with NULL Date_SK.', 1;

-- Assertion: Sales row count greater than zero
IF (
  SELECT
    COUNT(*)
  FROM
    fact.Sales
) = 0 THROW 50002,
'No rows loaded into fact.Sales',
1;

-- Assertion: Customers loaded correctly
IF (
  SELECT
    COUNT(*)
  FROM
    dim.Customer
  WHERE
    CustomerNo IN ('C001', 'C002')
) <> 2 THROW 50003,
'Customer dimension missing expected keys',
1;

-- Assertion: Products loaded correctly
IF (
  SELECT
    COUNT(*)
  FROM
    dim.Product
  WHERE
    ProductNo IN ('P001', 'P002')
) <> 2 THROW 50004,
'Product dimension missing expected keys',
1;

-- Assertion: Dates loaded correctly
IF (
  SELECT
    COUNT(*)
  FROM
    dim.Date
  WHERE
    Date IN ('2024-01-15', '2024-01-16')
) <> 2 THROW 50005,
'Date dimension missing expected dates',
1;
        END
        
GO
