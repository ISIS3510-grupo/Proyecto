# Tablero de Business Questions (BigQuery + Looker Studio)

Firestore → extensión "Stream Firestore to BigQuery" → dataset
`campusfind_analytics` (ubicación `us`) → una vista por BQ → Looker Studio.

| BQ | Colección | Extensión | Vista |
|---|---|---|---|
| Features más usadas (Jhostin, T3) | `featureUsageEvents` | `bq-feature-usage-events` | `bq_feature_usage` |

## Agregar una BQ
1. Copiar `extensions/bq-feature-usage-events.env` con otro nombre de instancia,
   cambiar `COLLECTION_PATH` y `TABLE_ID`, y registrarla en `firebase.json`.
2. `firebase deploy --only extensions --project campusfind-26ac2`.
3. Importar lo que ya existe (la extensión solo copia escrituras nuevas):
   `npx @firebaseextensions/fs-bq-import-collection --non-interactive -P campusfind-26ac2 -B campusfind-26ac2 -q false -s <colección> -d campusfind_analytics -t <TABLE_ID> -l us -m false -u true`
   (necesita credenciales de Google Cloud con acceso al proyecto).
4. Crear la vista con un archivo `bq_<nombre>.sql` en esta carpeta y agregarla al
   tablero como nueva fuente de datos.

No exportar `claimPrivate` ni `lostReportPrivate`: tienen respuestas privadas.
