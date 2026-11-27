CREATE OR REPLACE VIEW campusfind_analytics.bq_found_items_by_category
OPTIONS (description = 'BQ Camilo (Type 4): found items grouped by category with count and share.')
AS
SELECT
  IFNULL(NULLIF(LOWER(TRIM(JSON_VALUE(data, '$.category'))), ''), 'uncategorized') AS category,
  COUNT(*) AS items,
  ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM campusfind_analytics.found_items_raw_latest
WHERE operation != 'DELETE'
GROUP BY category;
