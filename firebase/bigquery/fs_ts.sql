-- Timestamp de Firestore en cualquiera de sus dos formas: la importación inicial
-- lo guarda como {_seconds, _nanoseconds} y la extensión como texto ISO.
CREATE OR REPLACE FUNCTION campusfind_analytics.fs_ts(j STRING) RETURNS TIMESTAMP AS (
  COALESCE(
    TIMESTAMP_SECONDS(SAFE_CAST(JSON_VALUE(j, '$._seconds') AS INT64)),
    SAFE.TIMESTAMP(JSON_VALUE(j, '$'))
  )
);
