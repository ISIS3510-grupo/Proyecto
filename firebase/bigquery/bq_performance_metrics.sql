-- BQ Daniel (Tipo 1): tiempo de respuesta al buscar posibles coincidencias.
-- BQ Emilio (Tipo 3): tiempo para registrar un reporte de objeto perdido o encontrado.
-- Una fila por medición de performanceMetrics.
CREATE OR REPLACE VIEW campusfind_analytics.bq_performance_metrics
OPTIONS (description = 'BQ Daniel (Type 1) and Emilio (Type 3): one row per performance measurement.')
AS
SELECT
  document_id AS metric_id,
  JSON_VALUE(data, '$.metricType') AS metric_type,
  CASE JSON_VALUE(data, '$.metricType')
    WHEN 'match_search' THEN 'Match search'
    WHEN 'report_registration' THEN 'Report registration'
    ELSE JSON_VALUE(data, '$.metricType')
  END AS metric_label,
  JSON_VALUE(data, '$.reportType') AS report_type,
  JSON_VALUE(data, '$.platform') AS platform,
  SAFE_CAST(JSON_VALUE(data, '$.durationMs') AS FLOAT64) AS duration_ms,
  SAFE_CAST(JSON_VALUE(data, '$.durationMs') AS FLOAT64) / 1000 AS duration_s,
  campusfind_analytics.fs_ts(JSON_QUERY(data, '$.recordedAt')) AS recorded_at,
  DATE(campusfind_analytics.fs_ts(JSON_QUERY(data, '$.recordedAt')), 'America/Bogota') AS recorded_on
FROM campusfind_analytics.performance_metrics_raw_latest
WHERE operation != 'DELETE';
