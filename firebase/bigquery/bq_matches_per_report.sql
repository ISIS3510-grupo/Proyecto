-- BQ Tipo 2: ¿cuántas posibles coincidencias se encuentran para un reporte perdido?
-- Una fila por reporte con su número de coincidencias guardadas.
CREATE OR REPLACE VIEW campusfind_analytics.bq_matches_per_report
OPTIONS (description = 'Type 2 BQ: one row per lost report with its number of stored matches.')
AS
WITH m AS (
  SELECT JSON_VALUE(data, '$.reportId') AS report_id, COUNT(*) AS match_count
  FROM campusfind_analytics.matches_raw_latest
  WHERE operation != 'DELETE' AND JSON_VALUE(data, '$.reportId') IS NOT NULL
  GROUP BY 1
)
SELECT r.report_id, r.category, r.status, COALESCE(m.match_count, 0) AS match_count
FROM campusfind_analytics.bq_lost_reports r
LEFT JOIN m USING (report_id);
