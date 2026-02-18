import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const out = path.resolve('./data/star_demo.db');
const db = new DatabaseSync(out, { open: true });
db.exec('PRAGMA foreign_keys = ON');
db.exec('DROP TABLE IF EXISTS fact_sales');
db.exec('DROP TABLE IF EXISTS dim_region');
db.exec('DROP TABLE IF EXISTS dim_date');
db.exec('CREATE TABLE dim_region (region_id INTEGER PRIMARY KEY, region_name TEXT)');
db.exec('CREATE TABLE dim_date (date_id INTEGER PRIMARY KEY, year INTEGER, month INTEGER)');
db.exec('CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, region_id INTEGER, date_id INTEGER, amount REAL, cost REAL, FOREIGN KEY(region_id) REFERENCES dim_region(region_id), FOREIGN KEY(date_id) REFERENCES dim_date(date_id))');
db.exec("INSERT INTO dim_region VALUES (1,'North'),(2,'South'),(3,'West')");
db.exec("INSERT INTO dim_date VALUES (202401,2024,1),(202402,2024,2),(202403,2024,3)");
db.exec("INSERT INTO fact_sales VALUES (1,1,202401,100,60),(2,1,202402,120,70),(3,2,202401,90,50),(4,3,202403,160,90)");
console.log(out);
