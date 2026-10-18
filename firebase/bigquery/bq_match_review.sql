-- BQ Sofía (Tipo 3): ¿qué porcentaje de estudiantes revisa una posible coincidencia
-- después de recibir la notificación? Una fila por notificación; viewedAt marca la revisión.
CREATE OR REPLACE VIEW campusfind_analytics.bq_match_review
OPTIONS (description = 'BQ Sofia (Type 3): one row per match notification, reviewed when viewedAt is set.')
AS
SELECT
  document_id AS notification_id,
  JSON_VALUE(data, '$.matchId') AS match_id,
  JSON_VALUE(data, '$.recipientUid') AS recipient_uid,
  JSON_VALUE(data, '$.channel') AS channel,
  -- Un documento tiene la clave con espacios al final.
  campusfind_analytics.fs_ts(COALESCE(JSON_QUERY(data, '$.sentAt'), JSON_QUERY(data, '$."sentAt  "'))) AS sent_at,
  campusfind_analytics.fs_ts(JSON_QUERY(data, '$.viewedAt')) AS viewed_at,
  JSON_QUERY(data, '$.viewedAt') IS NOT NULL AS reviewed,
  IF(JSON_QUERY(data, '$.viewedAt') IS NOT NULL, 1, 0) AS reviewed_count,
  -- Promediado da directamente el porcentaje de revisión.
  IF(JSON_QUERY(data, '$.viewedAt') IS NOT NULL, 100, 0) AS review_pct,
  IF(JSON_QUERY(data, '$.viewedAt') IS NOT NULL, 'Reviewed', 'Not reviewed') AS review_status
FROM campusfind_analytics.notifications_raw_latest
WHERE operation != 'DELETE';
