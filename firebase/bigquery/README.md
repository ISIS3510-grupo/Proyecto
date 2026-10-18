# Tablero de Business Questions (BigQuery + Looker Studio)

Firestore → extensión "Stream Firestore to BigQuery" → dataset
`campusfind_analytics` (ubicación `us`) → una vista por BQ → Looker Studio.

| BQ | Colección | Extensión | Vista |
|---|---|---|---|
| Features más usadas (Jhostin, T3) | `featureUsageEvents` | `bq-feature-usage-events` | `bq_feature_usage` |
| Tiempo de búsqueda de coincidencias (Daniel, T1) | `performanceMetrics` | `bq-performance-metrics` | `bq_performance_metrics` |
| Tiempo de registro de reportes (Emilio, T3) | `performanceMetrics` | `bq-performance-metrics` | `bq_performance_metrics` |
| % que revisa la coincidencia notificada (Sofía, T3) | `notifications` | `bq-notifications` | `bq_match_review` |
| Objetos no reclamados donables (Alex, T4) | `foundItems`, `appConfig` | `bq-found-items`, `bq-app-config` | `bq_donation_potential`, `bq_donation_unclaimed` |
| Verificación de propiedad con/sin detalle privado (Camilo, T3) | `claimVerifications` | `bq-claim-verifications` | `bq_ownership_verification` |
| Tiempo a "found" y estados atascados (T2) | `lostReports`, `appConfig` | `bq-lost-reports` | `bq_lost_reports` |
| Coincidencias por reporte (T2) | `lostReports`, `matches` | `bq-matches` | `bq_matches_per_report` |

`fs_ts.sql` define `campusfind_analytics.fs_ts`, que lee un timestamp de Firestore en sus
dos formas (la importación inicial y la extensión); créala antes que las vistas.

La BQ de Camilo necesita datos de `claimPrivate`, `foundItemPrivate` y
`lostReportPrivate`, que no se exportan. La función `refreshClaimVerifications`
(cada hora) aplica la misma comparación que `ClaimMatcher.kt` y escribe solo el
resultado (puntaje, veredicto y si el reporte tenía detalle privado) en
`claimVerifications`, que sí se exporta.

## Agregar una BQ
1. Copiar `extensions/bq-feature-usage-events.env` con otro nombre de instancia,
   cambiar `COLLECTION_PATH` y `TABLE_ID`, y registrarla en `firebase.json`.
2. `firebase deploy --only extensions --project campusfind-26ac2`.
3. Importar lo que ya existe (la extensión solo copia escrituras nuevas):
   `npx @firebaseextensions/fs-bq-import-collection --non-interactive -P campusfind-26ac2 -B campusfind-26ac2 -q false -s <colección> -d campusfind_analytics -t <TABLE_ID> -l us -m false -u true`
   (necesita credenciales de Google Cloud con acceso al proyecto).
4. Crear la vista con un archivo `bq_<nombre>.sql` en esta carpeta y agregarla al
   tablero como nueva fuente de datos.

No exportar `claimPrivate`, `lostReportPrivate`, `foundItemPrivate`, `users` ni `items`:
tienen respuestas privadas o correos.
