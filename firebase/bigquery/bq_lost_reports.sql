-- BQs Tipo 2 sobre reportes perdidos: tiempo promedio de "reported" a "found" por
-- categoría, y en qué estado se atascan (más de 7 días sin cambiar). Una fila por reporte.
CREATE OR REPLACE VIEW campusfind_analytics.bq_lost_reports
OPTIONS (description = 'Type 2 BQs: one row per lost report with time to found and stuck flag.')
AS
WITH cfg AS (
  SELECT JSON_VALUE_ARRAY(data, '$.categories') AS categories
  FROM campusfind_analytics.app_config_raw_latest
  WHERE document_id = 'general' AND operation != 'DELETE'
)
SELECT
  document_id AS report_id,
  -- Fuera de appConfig.categories (texto libre, vacío) cuenta como "Other".
  INITCAP(IF(LOWER(TRIM(JSON_VALUE(data, '$.category'))) IN UNNEST(cfg.categories),
             LOWER(TRIM(JSON_VALUE(data, '$.category'))), 'other')) AS category,
  JSON_VALUE(data, '$.status') AS status,
  campusfind_analytics.fs_ts(JSON_QUERY(data, '$.reportedAt')) AS reported_at,
  DATE(campusfind_analytics.fs_ts(JSON_QUERY(data, '$.reportedAt')), 'America/Bogota') AS reported_on,
  campusfind_analytics.fs_ts(JSON_QUERY(data, '$.foundAt')) AS found_at,
  campusfind_analytics.fs_ts(JSON_QUERY(data, '$.statusChangedAt')) AS status_changed_at,
  TIMESTAMP_DIFF(
    campusfind_analytics.fs_ts(JSON_QUERY(data, '$.foundAt')),
    campusfind_analytics.fs_ts(JSON_QUERY(data, '$.reportedAt')), HOUR) / 24 AS days_to_found,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
    COALESCE(campusfind_analytics.fs_ts(JSON_QUERY(data, '$.statusChangedAt')),
             campusfind_analytics.fs_ts(JSON_QUERY(data, '$.reportedAt'))), HOUR) / 24 AS days_in_status,
  IF(JSON_VALUE(data, '$.status') IN ('reported', 'found', 'ready_for_pickup', 'claimed')
     AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
       COALESCE(campusfind_analytics.fs_ts(JSON_QUERY(data, '$.statusChangedAt')),
                campusfind_analytics.fs_ts(JSON_QUERY(data, '$.reportedAt'))), HOUR) > 7 * 24, 1, 0) AS stuck
FROM campusfind_analytics.lost_reports_raw_latest
CROSS JOIN cfg
WHERE operation != 'DELETE';
