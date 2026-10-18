-- BQ Camilo (Tipo 3): ¿cómo difiere la tasa de verificación de propiedad exitosa entre
-- reportes con características privadas y sin ellas? Una fila por reclamo; la función
-- refreshClaimVerifications calcula el veredicto sin exponer las colecciones privadas.
CREATE OR REPLACE VIEW campusfind_analytics.bq_ownership_verification
OPTIONS (description = 'BQ Camilo (Type 3): one row per claim with its verification verdict and report group.')
AS
SELECT
  document_id AS claim_id,
  JSON_VALUE(data, '$.reportId') AS report_id,
  SAFE_CAST(JSON_VALUE(data, '$.hasPrivateDetail') AS BOOL) AS has_private_detail,
  IF(SAFE_CAST(JSON_VALUE(data, '$.hasPrivateDetail') AS BOOL), 'With private detail', 'Without private detail') AS report_group,
  SAFE_CAST(JSON_VALUE(data, '$.score') AS FLOAT64) AS score,
  JSON_VALUE(data, '$.verdict') AS verdict,
  CASE JSON_VALUE(data, '$.verdict')
    WHEN 'LIKELY_MATCH' THEN 'Likely match'
    WHEN 'PARTIAL_MATCH' THEN 'Partial match'
    ELSE 'No match'
  END AS verdict_label,
  IF(JSON_VALUE(data, '$.verdict') = 'LIKELY_MATCH', 1, 0) AS successful,
  -- Promediado da directamente la tasa de éxito en porcentaje.
  IF(JSON_VALUE(data, '$.verdict') = 'LIKELY_MATCH', 100, 0) AS success_pct,
  campusfind_analytics.fs_ts(JSON_QUERY(data, '$.verifiedAt')) AS verified_at
FROM campusfind_analytics.claim_verifications_raw_latest
WHERE operation != 'DELETE';
