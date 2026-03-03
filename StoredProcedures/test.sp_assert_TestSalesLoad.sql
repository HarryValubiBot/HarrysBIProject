
        CREATE   PROCEDURE [test].[sp_assert_TestSalesLoad]
        AS
        BEGIN
            SET NOCOUNT ON;
            IF EXISTS (
  SELECT
    1
  FROM
    fact.Sales
  WHERE
    Amount < 0
) THROW 50001,
'Sales contains negative amount',
1;
        END
        
GO
