# CampusFind — contrato de datos v1

Proyecto Firebase: campusfind-26ac2
Base Firestore: (default)
Este contrato es compartido por las apps Kotlin y Flutter.

## Colecciones y documentos

users/{uid}
  email, displayName, role (student|admin), createdAt
  El usuario no puede asignarse el rol admin.

lostReports/{reportId}
  ownerUid, category, title, description, status,
  locationName, latitude, longitude, photoPath,
  reportedAt, statusChangedAt, foundAt, readyForPickupAt, claimedAt, closedAt
  status: reported|found|ready_for_pickup|claimed|closed

lostReportPrivate/{reportId}
  ownerUid, privateVerificationDetail
  Acceso restringido al propietario y al administrador.

foundItems/{itemId}
  reporterUid, category, title, publicDescription, status,
  locationName, latitude, longitude, photoPath,
  semesterId, donationEligible, donationStatus, createdAt
  Los datos de verificación privados van en otro documento.

foundItemPrivate/{itemId}
  privateCharacteristics
  Acceso exclusivo del administrador.

reportStatusEvents/{eventId}
  reportId, ownerUid, category, fromStatus, toStatus, occurredAt
  Historial para calcular transiciones y tiempo en cada etapa.

matches/{matchId}
  reportId, foundItemId, ownerUid, score, strategyName,
  strategyVersion, createdAt
  Una coincidencia posible no equivale a una reclamación aprobada.

notifications/{notificationId}
  recipientUid, matchId, sentAt, viewedAt, channel
  Una notificación por coincidencia y destinatario.

performanceMetrics/{metricId}
  uid, metricType, reportType (opcional), platform, durationMs, recordedAt
  metricType: match_search|report_registration
  reportType: lost|found
  platform: kotlin|flutter

items/{itemId}
  title, description, category, location (GeoPoint), userEmail, createdAt
  Objetos reportados desde Flutter. userEmail es el correo de quien reporta.

analytics/{docId}
  Agregados anónimos de las BQ, sin datos personales. Los lee cualquier estudiante.
  reportBottleneck y reportRegistrationTime: los recalcula el admin desde Flutter.

claims/{claimId}
  reportId, foundItemId, claimantUid, status, createdAt, resolvedAt
  Las respuestas privadas de propiedad requieren acceso restringido.

featureUsageEvents/{eventId}
  uid, feature, platform, occurredAt
  feature: search_found_items|report_lost_item|submit_lost_report|
           report_found_item|view_my_report|password_login|biometric_login
  platform: kotlin|flutter
  Un documento por uso de una funcionalidad. Solo lo lee el admin.

analytics/featureUsage
  totals {feature: count}, last7Days {feature: count},
  byPlatform {platform: {feature: count}}, eventCount, computedAt
  Lo escribe la Cloud Function aggregateFeatureUsage. Solo lo lee el admin.

officeLocations/{locationId}
  name, latitude, longitude, address, active

appConfig/general
  currentSemesterId, categories, matchingThreshold

## Preguntas de negocio

BQ1 (funcionalidad Type 2 de Jhostin y Camilo): lostReports + reportStatusEvents; reported -> found por categoría.
BQ2 Camilo: reportStatusEvents + estado actual de lostReports; etapa con mayor permanencia.
BQ3 Sofia: notifications; enviados frente a vistos, con una ventana de medición definida.
BQ4 Daniel: performanceMetrics con metricType=match_search.
BQ5 Emilio: performanceMetrics con metricType=report_registration.
BQ6 Alex: foundItems sin reclamar, por semestre, categoría y elegibilidad de donación.
BQ7 Jhostin (Type 3): featureUsageEvents; uso de cada funcionalidad, total y últimos 7 días.

## Reglas del equipo

- Kotlin y Flutter usan exactamente estos nombres de campos y estados.
- Las fotos van en Storage; Firestore guarda photoPath, la ruta del archivo (no una URL):
  foundItems/{itemId}.jpg y lostReports/{reportId}.jpg. La app obtiene la URL con getDownloadURL.
  Si no hay foto, el campo se omite.
- Los detalles privados se guardan en documentos separados.
- El admin cambia estados mediante un lote validado por reglas; las métricas del cliente no son datos auditados.
- Los tiempos durationMs se miden en la app y se guardan en milisegundos.

## Precisiones para implementación y seguridad

- lostReports también guarda statusChangedAt. Es el momento en que comenzó
  su estado actual y se actualiza junto con cada cambio de estado.
- reportStatusEvents también guarda ownerUid para identificar al dueño
  del reporte. El admin crea cada evento en el mismo lote que cambia el reporte.
- performanceMetrics también guarda uid. La app mide durationMs;
  el dato identifica a quien lo envió y no se trata como una medición
  imposible de alterar por el cliente.
- claims no guarda respuestas privadas de propiedad en su documento público.
  Esas respuestas van en claimPrivate/{claimId}, accesible únicamente
  al reclamante y al administrador.
- foundItems.status usa: available|claimed|donated.
  Solo el admin cambia donationEligible y donationStatus con las transiciones permitidas.
- BQ1: promedio de foundAt - reportedAt para reportes que llegaron a found,
  agrupados por category.
- BQ2: entre reportes activos, contar los que llevan más de 7 días en
  su estado actual usando statusChangedAt; comparar por estado.
- BQ3: porcentaje de destinatarios únicos que abren al menos un match
  dentro de los 7 días posteriores a una notificación enviada.
  Evaluar destinatarios cuya notificación ya cumplió los 7 días.

## Contrato operativo de las reglas publicadas

- Un foundItem nuevo requiere semesterId, donationEligible=false,
  donationStatus=none y status=available.
- Donación por admin: none → eligible (donationEligible=true);
  eligible → donated (status=donated). La decisión del fin de semestre
  la toma el admin; todavía no hay proceso automático.
- matchId = reportId + "_" + foundItemId. Solo el admin crea matches
  de reportes en reported y objetos en available; score está entre 0 y 1.
- notificationId = matchId + "_" + recipientUid. Por ahora channel=in_app.
  Solo el admin crea el aviso para el dueño del match; el destinatario
  registra viewedAt una sola vez al abrirlo.
- eventId = reportId + "_" + toStatus. El admin escribe el evento y el
  cambio de estado del reporte en un mismo lote.
- No hay algoritmo de matching, envío de correo/SMS, panel analítico
  ni cuenta admin real configurados todavía. claims y claimPrivate están
  reservados para el flujo de reclamación posterior.
