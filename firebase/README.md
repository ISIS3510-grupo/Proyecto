# Firebase compartido de CampusFind

Proyecto: campusfind-26ac2. Kotlin y Flutter usan el mismo `schema.md`.

- `firestore.rules`: reglas publicadas.
- `firestore.indexes.json`: índices publicados.
- `storage.rules`: reglas de Storage (fotos de `foundItems/` y `lostReports/`).
- `app-config.json`: configuración inicial de `appConfig/general`.
- `rules.test.cjs`: pruebas de permisos con el emulador.
- `storage.test.cjs`: pruebas de las reglas de Storage.

Para probar desde esta carpeta:
`npm ci`
`firebase emulators:exec --only firestore --project demo-campusfind 'node rules.test.cjs'`
`firebase emulators:exec --only firestore,storage --project demo-campusfind 'node storage.test.cjs'`

Las reglas se publican solo desde este repo, nunca editándolas en la consola:
`firebase deploy --only firestore:rules,storage --project campusfind-26ac2`

Las demás colecciones aparecerán al guardar datos reales. Los procesos de
cambio de estado, matching y notificaciones aún deben implementarse.
