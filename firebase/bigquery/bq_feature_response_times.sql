-- BQ Jhostin (Tipo 5 = 1 + 3): ¿qué funcionalidades tienen los tiempos de respuesta
-- más largos y conviene optimizar primero? Cruza cuánto se usa cada funcionalidad
-- (featureUsageEvents) con cuánto espera el estudiante (durationMs en el evento, y
-- performanceMetrics para la búsqueda de coincidencias y el registro de reportes).
-- Una fila por funcionalidad y plataforma.
CREATE OR REPLACE VIEW campusfind_analytics.bq_feature_response_times
OPTIONS (description = 'BQ Jhostin (Type 5): Which system features have the longest response times and should be prioritized for optimization? One row per feature and platform.')
AS
WITH uses AS (
  -- Usos de featureUsageEvents; los eventos anteriores al Sprint 3 no traen durationMs.
  SELECT
    feature_label AS feature,
    platform,
    SAFE_CAST(JSON_VALUE(e.data, '$.durationMs') AS FLOAT64) / 1000 AS duration_s
  FROM campusfind_analytics.bq_feature_usage AS u
  JOIN campusfind_analytics.feature_usage_events_raw_latest AS e
    ON e.document_id = u.event_id
  WHERE e.operation != 'DELETE'
  UNION ALL
  -- Cada medición de performanceMetrics es un uso con su tiempo.
  SELECT
    CASE
      WHEN metric_type = 'match_search' THEN 'Search possible matches'
      WHEN metric_type = 'report_registration' AND report_type = 'found' THEN 'Register a found item'
      WHEN metric_type = 'report_registration' THEN 'Register a lost report'
      ELSE metric_label
    END,
    platform,
    duration_s
  FROM campusfind_analytics.bq_performance_metrics
)
SELECT
  feature,
  INITCAP(platform) AS platform,
  COUNT(*) AS uses,
  COUNT(duration_s) AS timed_uses,
  ROUND(AVG(duration_s), 2) AS avg_response_s,
  ROUND(APPROX_QUANTILES(duration_s, 100 IGNORE NULLS)[SAFE_OFFSET(50)], 2) AS p50_response_s,
  ROUND(APPROX_QUANTILES(duration_s, 100 IGNORE NULLS)[SAFE_OFFSET(90)], 2) AS p90_response_s,
  -- Prioridad: tiempo total que los estudiantes esperan en esta funcionalidad
  -- (usos x tiempo promedio). Lento y muy usado va primero.
  ROUND(COUNT(*) * AVG(duration_s), 1) AS estimated_wait_s
FROM uses
GROUP BY feature, platform
HAVING COUNT(duration_s) > 0;
