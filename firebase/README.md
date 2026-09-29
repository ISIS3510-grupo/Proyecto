# Firebase compartido de CampusFind

Proyecto: campusfind-26ac2. Kotlin y Flutter usan el mismo `schema.md`.

- `firestore.rules`: reglas publicadas.
- `firestore.indexes.json`: índices publicados.
- `app-config.json`: configuración inicial de `appConfig/general`.
- `rules.test.cjs`: pruebas de permisos con el emulador.

Para probar desde esta carpeta:
`npm ci`
`firebase emulators:exec --only firestore --project demo-campusfind 'node rules.test.cjs'`

Las demás colecciones aparecerán al guardar datos reales. Los procesos de
cambio de estado, matching y notificaciones aún deben implementarse.
