const fs = require('node:fs');
const {
  initializeTestEnvironment, assertSucceeds, assertFails
} = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, getDoc, getDocs, collection, updateDoc, writeBatch, serverTimestamp,
  GeoPoint
} = require('firebase/firestore');

async function check(nombre, operacion, permitido) {
  if (permitido) await assertSucceeds(operacion);
  else await assertFails(operacion);
  console.log(`OK: ${nombre}`);
}

async function main() {
  const env = await initializeTestEnvironment({
    projectId: 'demo-campusfind',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
  });

  try {
    const camilo = env.authenticatedContext('camilo', {
      email: 'camilo@uniandes.edu.co', email_verified: true
    }).firestore();

    const sofia = env.authenticatedContext('sofia', {
      email: 'sofia@uniandes.edu.co', email_verified: true
    }).firestore();

    const externo = env.authenticatedContext('externo', {
      email: 'externo@gmail.com', email_verified: true
    }).firestore();

    const anonimo = env.unauthenticatedContext().firestore();

    await check('Camilo crea su perfil de estudiante',
      setDoc(doc(camilo, 'users/camilo'), {
        email: 'camilo@uniandes.edu.co',
        displayName: 'Camilo',
        role: 'student',
        createdAt: serverTimestamp()
      }), true);

    await check('Camilo no puede ascenderse a admin',
      updateDoc(doc(camilo, 'users/camilo'), { role: 'admin' }), false);

    await check('Correo externo no crea perfil',
      setDoc(doc(externo, 'users/externo'), {
        email: 'externo@gmail.com',
        displayName: 'Externo',
        role: 'student',
        createdAt: serverTimestamp()
      }), false);

    await check('Camilo crea reporte propio',
      setDoc(doc(camilo, 'lostReports/reporte1'), {
        ownerUid: 'camilo',
        category: 'electronics',
        title: 'Celular',
        description: 'Celular extraviado',
        status: 'reported',
        reportedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp()
      }), true);

    await check('Camilo lee su reporte',
      getDoc(doc(camilo, 'lostReports/reporte1')), true);

    await check('Sofia no lee reporte ajeno',
      getDoc(doc(sofia, 'lostReports/reporte1')), false);

    await check('Camilo no cambia el estado directamente',
      updateDoc(doc(camilo, 'lostReports/reporte1'), { status: 'found' }), false);

    await check('Camilo registra su detalle privado',
      setDoc(doc(camilo, 'lostReportPrivate/reporte1'), {
        ownerUid: 'camilo',
        privateVerificationDetail: 'Marca en la parte trasera'
      }), true);

    await check('Sofia no lee detalle privado ajeno',
      getDoc(doc(sofia, 'lostReportPrivate/reporte1')), false);

    await check('Camilo crea objeto encontrado',
      setDoc(doc(camilo, 'foundItems/objeto1'), {
        reporterUid: 'camilo',
        category: 'electronics',
        title: 'Celular encontrado',
        publicDescription: 'Celular negro',
        status: 'available',
        semesterId: '2026-2',
        donationEligible: false,
        donationStatus: 'none',
        createdAt: serverTimestamp()
      }), true);

    await check('Camilo crea objeto encontrado con foto en Storage',
      setDoc(doc(camilo, 'foundItems/objeto2'), {
        reporterUid: 'camilo',
        category: 'electronics',
        title: 'Audífonos encontrados',
        publicDescription: 'Audífonos blancos',
        status: 'available',
        photoPath: 'foundItems/objeto2.jpg',
        semesterId: '2026-2',
        donationEligible: false,
        donationStatus: 'none',
        createdAt: serverTimestamp()
      }), true);

    await check('photoPath de objeto debe apuntar a su propio archivo',
      setDoc(doc(camilo, 'foundItems/objeto3'), {
        reporterUid: 'camilo',
        category: 'electronics',
        title: 'Audífonos encontrados',
        publicDescription: 'Audífonos blancos',
        status: 'available',
        photoPath: 'foundItems/otro.jpg',
        semesterId: '2026-2',
        donationEligible: false,
        donationStatus: 'none',
        createdAt: serverTimestamp()
      }), false);

    await check('imageUrl ya no es un campo permitido',
      setDoc(doc(camilo, 'foundItems/objeto4'), {
        reporterUid: 'camilo',
        category: 'electronics',
        title: 'Audífonos encontrados',
        publicDescription: 'Audífonos blancos',
        status: 'available',
        imageUrl: 'https://example.com/foto.jpg',
        semesterId: '2026-2',
        donationEligible: false,
        donationStatus: 'none',
        createdAt: serverTimestamp()
      }), false);

    await check('Camilo crea reporte con foto en Storage',
      setDoc(doc(camilo, 'lostReports/reporte2'), {
        ownerUid: 'camilo',
        category: 'electronics',
        title: 'Audífonos',
        description: 'Audífonos extraviados',
        status: 'reported',
        photoPath: 'lostReports/reporte2.jpg',
        reportedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp()
      }), true);

    await check('Camilo agrega la foto a su reporte después',
      updateDoc(doc(camilo, 'lostReports/reporte1'), {
        photoPath: 'lostReports/reporte1.jpg'
      }), true);

    await check('Camilo no apunta su reporte a la foto de otro',
      updateDoc(doc(camilo, 'lostReports/reporte1'), {
        photoPath: 'foundItems/objeto2.jpg'
      }), false);

    await check('Sofia lee descripción pública',
      getDoc(doc(sofia, 'foundItems/objeto1')), true);

    await check('Camilo registra características privadas',
      setDoc(doc(camilo, 'foundItemPrivate/objeto1'), {
        privateCharacteristics: 'Detalle que solo conoce el dueño'
      }), true);

    await check('Estudiante no lee características privadas',
      getDoc(doc(camilo, 'foundItemPrivate/objeto1')), false);

    await check('Anónimo no lee objetos',
      getDoc(doc(anonimo, 'foundItems/objeto1')), false);

    await check('Camilo registra tiempo de búsqueda',
      setDoc(doc(camilo, 'performanceMetrics/medicion1'), {
        uid: 'camilo',
        metricType: 'match_search',
        platform: 'kotlin',
        durationMs: 135,
        recordedAt: serverTimestamp()
      }), true);

    await check('Camilo no atribuye una medición a Sofia',
      setDoc(doc(camilo, 'performanceMetrics/medicion2'), {
        uid: 'sofia',
        metricType: 'match_search',
        platform: 'kotlin',
        durationMs: 135,
        recordedAt: serverTimestamp()
      }), false);


    await check('Camilo sí edita su nombre',
      updateDoc(doc(camilo, 'users/camilo'), { displayName: 'Camilo Puerto' }), true);

    await check('Camilo sí edita la descripción de su reporte',
      updateDoc(doc(camilo, 'lostReports/reporte1'), {
        description: 'Celular negro extraviado'
      }), true);

    const dominioParecido = env.authenticatedContext('falso', {
      email: 'falso@uniandesXeduXco', email_verified: true
    }).firestore();

    await check('Dominio parecido no crea perfil',
      setDoc(doc(dominioParecido, 'users/falso'), {
        email: 'falso@uniandesXeduXco',
        displayName: 'Falso',
        role: 'student',
        createdAt: serverTimestamp()
      }), false);

    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'users/admin'), {
        email: 'admin@uniandes.edu.co',
        displayName: 'Administrador',
        role: 'admin',
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'notifications/aviso1'), {
        recipientUid: 'camilo',
        matchId: 'coincidencia1',
        channel: 'in_app',
        sentAt: serverTimestamp()
      });
    });

    const administrador = env.authenticatedContext('admin', {
      email: 'admin@uniandes.edu.co', email_verified: true
    }).firestore();

    await check('Admin lee características privadas',
      getDoc(doc(administrador, 'foundItemPrivate/objeto1')), true);

    await check('Sofia no abre notificación de Camilo',
      getDoc(doc(sofia, 'notifications/aviso1')), false);

    await check('Camilo marca su notificación como vista',
      updateDoc(doc(camilo, 'notifications/aviso1'), {
        viewedAt: serverTimestamp()
      }), true);



    const coincidencia = {
      reportId: 'reporte1',
      foundItemId: 'objeto1',
      ownerUid: 'camilo',
      score: 0.8,
      strategyName: 'basic',
      strategyVersion: '1',
      createdAt: serverTimestamp()
    };

    await check('Estudiante no inventa una coincidencia',
      setDoc(doc(camilo, 'matches/reporte1_objeto1'), coincidencia), false);

    await check('Admin no asigna la coincidencia a otra persona',
      setDoc(doc(administrador, 'matches/reporte1_objeto1'), {
        ...coincidencia, ownerUid: 'sofia'
      }), false);

    await check('Admin crea coincidencia válida',
      setDoc(doc(administrador, 'matches/reporte1_objeto1'), coincidencia), true);

    await check('Camilo lee su coincidencia',
      getDoc(doc(camilo, 'matches/reporte1_objeto1')), true);

    await check('Sofia no lee la coincidencia de Camilo',
      getDoc(doc(sofia, 'matches/reporte1_objeto1')), false);

    await check('Admin no altera el puntaje después',
      updateDoc(doc(administrador, 'matches/reporte1_objeto1'), {
        score: 1
      }), false);


    const aviso = {
      recipientUid: 'camilo',
      matchId: 'reporte1_objeto1',
      channel: 'in_app',
      sentAt: serverTimestamp()
    };

    await check('Estudiante no crea avisos',
      setDoc(doc(camilo, 'notifications/reporte1_objeto1_camilo'), aviso), false);

    await check('Admin no avisa a la persona equivocada',
      setDoc(doc(administrador, 'notifications/reporte1_objeto1_sofia'), {
        ...aviso, recipientUid: 'sofia'
      }), false);

    await check('Admin crea aviso para el dueño del match',
      setDoc(doc(administrador, 'notifications/reporte1_objeto1_camilo'), aviso), true);

    await check('Camilo lee su aviso',
      getDoc(doc(camilo, 'notifications/reporte1_objeto1_camilo')), true);

    await check('Sofia no lee el aviso de Camilo',
      getDoc(doc(sofia, 'notifications/reporte1_objeto1_camilo')), false);

    await check('Camilo marca el aviso como visto',
      updateDoc(doc(camilo, 'notifications/reporte1_objeto1_camilo'), {
        viewedAt: serverTimestamp()
      }), true);

    await check('Camilo no cambia la fecha de vista otra vez',
      updateDoc(doc(camilo, 'notifications/reporte1_objeto1_camilo'), {
        viewedAt: serverTimestamp()
      }), false);

    await check('Admin no cambia el estado sin crear evento',
      updateDoc(doc(administrador, 'lostReports/reporte1'), {
        status: 'found',
        statusChangedAt: serverTimestamp(),
        foundAt: serverTimestamp()
      }), false);

    await check('Admin no crea evento sin cambiar el reporte',
      setDoc(doc(administrador, 'reportStatusEvents/reporte1_found'), {
        reportId: 'reporte1',
        ownerUid: 'camilo',
        category: 'electronics',
        fromStatus: 'reported',
        toStatus: 'found',
        occurredAt: serverTimestamp()
      }), false);

    const lote = writeBatch(administrador);
    lote.update(doc(administrador, 'lostReports/reporte1'), {
      status: 'found',
      statusChangedAt: serverTimestamp(),
      foundAt: serverTimestamp()
    });
    lote.set(doc(administrador, 'reportStatusEvents/reporte1_found'), {
      reportId: 'reporte1',
      ownerUid: 'camilo',
      category: 'electronics',
      fromStatus: 'reported',
      toStatus: 'found',
      occurredAt: serverTimestamp()
    });
    await check('Admin cambia estado y crea evento en un solo lote',
      lote.commit(), true);

    await check('Camilo lee el evento de su reporte',
      getDoc(doc(camilo, 'reportStatusEvents/reporte1_found')), true);

    await check('Sofia no lee el evento de Camilo',
      getDoc(doc(sofia, 'reportStatusEvents/reporte1_found')), false);


    await check('Admin no dona directamente un objeto',
      updateDoc(doc(administrador, 'foundItems/objeto1'), {
        status: 'donated',
        donationEligible: true,
        donationStatus: 'donated'
      }), false);

    await check('Estudiante no decide elegibilidad de donación',
      updateDoc(doc(camilo, 'foundItems/objeto1'), {
        donationEligible: true,
        donationStatus: 'eligible'
      }), false);

    await check('Admin marca objeto como elegible',
      updateDoc(doc(administrador, 'foundItems/objeto1'), {
        donationEligible: true,
        donationStatus: 'eligible'
      }), true);

    await check('Admin registra donación de objeto elegible',
      updateDoc(doc(administrador, 'foundItems/objeto1'), {
        status: 'donated',
        donationStatus: 'donated'
      }), true);

    const item = {
      title: 'Botella',
      description: 'Botella azul',
      category: 'other',
      location: new GeoPoint(4.6014, -74.0661),
      userEmail: 'sofia@uniandes.edu.co',
      createdAt: serverTimestamp()
    };

    await check('Sofia reporta un item desde Flutter',
      setDoc(doc(sofia, 'items/item1'), item), true);

    await check('Sofia no reporta un item con el correo de otro',
      setDoc(doc(sofia, 'items/item2'), { ...item, userEmail: 'camilo@uniandes.edu.co' }),
      false);

    await check('Item con campos extra no se guarda',
      setDoc(doc(sofia, 'items/item3'), { ...item, extra: true }), false);

    await check('Camilo lista los items',
      getDocs(collection(camilo, 'items')), true);

    await check('Correo externo no lee items',
      getDocs(collection(externo, 'items')), false);

    await check('Admin recalcula el cuello de botella',
      setDoc(doc(administrador, 'analytics/reportBottleneck'), {
        reported: 1, found: 0, ready_for_pickup: 0, claimed: 0,
        updatedAt: serverTimestamp()
      }), true);

    await check('Estudiante no escribe agregados',
      setDoc(doc(camilo, 'analytics/reportBottleneck'), { reported: 99 }), false);

    await check('Admin no escribe agregados fuera de la lista',
      setDoc(doc(administrador, 'analytics/featureUsage'), { eventCount: 1 }), false);

    await check('Estudiante lee un agregado',
      getDoc(doc(camilo, 'analytics/reportBottleneck')), true);

    await check('Métrica de registro con reportType',
      setDoc(doc(camilo, 'performanceMetrics/medicionTipo'), {
        uid: 'camilo', metricType: 'report_registration', reportType: 'found',
        platform: 'flutter', durationMs: 900, recordedAt: serverTimestamp()
      }), true);

    await check('reportType inválido no se guarda',
      setDoc(doc(camilo, 'performanceMetrics/medicionMala'), {
        uid: 'camilo', metricType: 'report_registration', reportType: 'otro',
        platform: 'flutter', durationMs: 900, recordedAt: serverTimestamp()
      }), false);

    console.log('RESULTADO: todas las pruebas de permisos pasaron');
  } finally {
    await env.cleanup();
  }
}

main().catch(error => {
  console.error('FALLÓ LA PRUEBA:', error);
  process.exitCode = 1;
});
