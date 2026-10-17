-- BQ Jhostin (Tipo 3): ¿qué features usan más los estudiantes?
-- Una fila por uso. Lee la vista que mantiene la extensión
-- bq-feature-usage-events a partir de featureUsageEvents.
CREATE OR REPLACE VIEW campusfind_analytics.bq_feature_usage
OPTIONS (description = 'BQ Jhostin (Type 3): Which app features are used most frequently by students? One row per feature use.')
AS
SELECT
  document_id AS event_id,
  JSON_VALUE(data, '$.uid') AS uid,
  JSON_VALUE(data, '$.feature') AS feature,
  CASE JSON_VALUE(data, '$.feature')
    WHEN 'search_found_items' THEN 'Search found items'
    WHEN 'report_lost_item' THEN 'Open "I lost an item"'
    WHEN 'submit_lost_report' THEN 'Send a lost report'
    WHEN 'report_found_item' THEN 'Open "I found an item"'
    WHEN 'view_my_report' THEN 'View my report'
    WHEN 'password_login' THEN 'Password login'
    WHEN 'biometric_login' THEN 'Biometric login'
    ELSE JSON_VALUE(data, '$.feature')
  END AS feature_label,
  JSON_VALUE(data, '$.platform') AS platform,
  -- La importación inicial guarda el Timestamp como {_seconds, _nanoseconds}.
  COALESCE(
    TIMESTAMP_SECONDS(SAFE_CAST(JSON_VALUE(data, '$.occurredAt._seconds') AS INT64)),
    SAFE.TIMESTAMP(JSON_VALUE(data, '$.occurredAt'))
  ) AS occurred_at
FROM campusfind_analytics.feature_usage_events_raw_latest
WHERE operation != 'DELETE';
