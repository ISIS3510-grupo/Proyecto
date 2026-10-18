-- BQ Alex (Tipo 4): solo los objetos sin reclamar del semestre actual, que son los
-- candidatos a donación al cierre del semestre.
CREATE OR REPLACE VIEW campusfind_analytics.bq_donation_unclaimed
OPTIONS (description = 'BQ Alex (Type 4): unclaimed found items of the current semester.')
AS
SELECT *
FROM campusfind_analytics.bq_donation_potential
WHERE unclaimed AND is_current_semester;
