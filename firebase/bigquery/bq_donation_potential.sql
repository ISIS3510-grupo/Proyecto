-- BQ Alex (Tipo 4): ¿qué tipos de objetos no reclamados al final del semestre pueden
-- donarse? Una fila por objeto encontrado, con la categoría normalizada.
CREATE OR REPLACE VIEW campusfind_analytics.bq_donation_potential
OPTIONS (description = 'BQ Alex (Type 4): one row per found item with donation flags and normalized category.')
AS
WITH cfg AS (
  SELECT
    JSON_VALUE(data, '$.currentSemesterId') AS current_semester,
    JSON_VALUE_ARRAY(data, '$.categories') AS categories
  FROM campusfind_analytics.app_config_raw_latest
  WHERE document_id = 'general' AND operation != 'DELETE'
)
SELECT
  f.document_id AS item_id,
  -- Fuera de appConfig.categories (texto libre, vacío) cuenta como "Other".
  INITCAP(IF(LOWER(TRIM(JSON_VALUE(f.data, '$.category'))) IN UNNEST(cfg.categories),
             LOWER(TRIM(JSON_VALUE(f.data, '$.category'))), 'other')) AS category,
  JSON_VALUE(f.data, '$.status') AS status,
  COALESCE(SAFE_CAST(JSON_VALUE(f.data, '$.donationEligible') AS BOOL), FALSE) AS donation_eligible,
  IF(COALESCE(SAFE_CAST(JSON_VALUE(f.data, '$.donationEligible') AS BOOL), FALSE), 'Eligible', 'Not eligible') AS donation_group,
  IF(COALESCE(SAFE_CAST(JSON_VALUE(f.data, '$.donationEligible') AS BOOL), FALSE), 1, 0) AS eligible_count,
  JSON_VALUE(f.data, '$.donationStatus') AS donation_status,
  JSON_VALUE(f.data, '$.semesterId') AS semester_id,
  JSON_VALUE(f.data, '$.semesterId') = cfg.current_semester AS is_current_semester,
  JSON_VALUE(f.data, '$.status') = 'available' AS unclaimed,
  campusfind_analytics.fs_ts(JSON_QUERY(f.data, '$.createdAt')) AS created_at
FROM campusfind_analytics.found_items_raw_latest f
-- LEFT JOIN: sin appConfig/general exportado se conservan las filas (categoría "Other").
LEFT JOIN cfg ON TRUE
WHERE f.operation != 'DELETE';
