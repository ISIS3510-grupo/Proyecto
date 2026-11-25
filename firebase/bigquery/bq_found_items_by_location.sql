CREATE OR REPLACE VIEW
`campusfind-26ac2.campusfind_analytics.bq_found_items_by_location`
AS

WITH locations AS (
    SELECT
        document_id,
        LOWER(TRIM(
            COALESCE(JSON_VALUE(data, '$.locationName'), '')
        )) AS location
    FROM
        `campusfind-26ac2.campusfind_analytics.found_items_raw_latest`
    WHERE operation != 'DELETE'
),

cleaned AS (
    SELECT
        document_id,
        TRIM(
            REGEXP_REPLACE(
                REGEXP_REPLACE(location, r'^edificio\s+', ''),
                r'\s+building$', ''
            )
        ) AS location_key
    FROM locations
),

normalized AS (
    SELECT
        document_id,
        CASE
            WHEN location_key IN (
                'ml', 'mario laserna', 'mario laserna (ml)'
            )
            THEN 'Edificio Mario Laserna (ML)'

            WHEN location_key IN (
                'sd', 'santo domingo', 'santo domingo (sd)'
            )
            THEN 'Edificio Santo Domingo (SD)'

            WHEN REGEXP_CONTAINS(location_key, r'\blleras\b')
                OR location_key = 'll'
            THEN 'Edificio Alberto Lleras Camargo (LL)'

            WHEN location_key IN (
                '', 'current location',
                'sin ubicación registrada'
            )
            THEN NULL

            ELSE INITCAP(location_key)
        END AS campus_location
    FROM cleaned
)

SELECT
    campus_location,
    COUNT(DISTINCT document_id) AS total_found_items
FROM normalized
WHERE campus_location IS NOT NULL
GROUP BY campus_location;
