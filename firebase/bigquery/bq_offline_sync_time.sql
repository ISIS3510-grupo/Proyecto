-- BQ Sofía (Tipo 1): ¿cómo se comporta el tiempo de sincronización de reportes al
-- recuperar la conexión? Una fila por recuperación (performanceMetrics, offline_sync).
CREATE OR REPLACE VIEW campusfind_analytics.bq_offline_sync_time
OPTIONS (description = 'BQ Sofia (Type 1): How does the report synchronization time behave after recovering from an offline state? One row per recovery.')
AS
SELECT
  document_id AS metric_id,
  TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.recordedAt._seconds') AS INT64)) AS synced_at,
  DATE(TIMESTAMP_SECONDS(CAST(JSON_VALUE(data, '$.recordedAt._seconds') AS INT64)), 'America/Bogota') AS synced_on,
  JSON_VALUE(data, '$.platform') AS platform,
  SAFE_CAST(JSON_VALUE(data, '$.durationMs') AS FLOAT64) / 1000 AS sync_s,
  SAFE_CAST(JSON_VALUE(data, '$.reportCount') AS INT64) AS reports_synced,
  SAFE_CAST(JSON_VALUE(data, '$.offlineDurationMs') AS FLOAT64) / 1000 AS offline_s
FROM campusfind_analytics.performance_metrics_raw_latest
WHERE operation != 'DELETE'
  AND JSON_VALUE(data, '$.metricType') = 'offline_sync'
;
