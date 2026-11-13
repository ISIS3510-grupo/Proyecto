-- BQ Jhostin (Tipo 3): ¿qué features usan más los estudiantes?
-- Una fila por uso. Reportar un objeto perdido cuenta una sola vez, al abrir
-- "I lost an item": enviar el formulario (submit_lost_report) es el final del
-- mismo flujo y contarlo también sumaba 2 por cada reporte.
-- Créala después de bq_feature_events.
CREATE OR REPLACE VIEW campusfind_analytics.bq_feature_usage
OPTIONS (description = 'BQ Jhostin (Type 3): Which app features are used most frequently by students? One row per feature use; a lost report counts once.')
AS
SELECT *
FROM campusfind_analytics.bq_feature_events
WHERE feature != 'submit_lost_report';
