const fs = require('node:fs');
const {
  initializeTestEnvironment, assertSucceeds, assertFails
} = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes } = require('firebase/storage');

async function check(nombre, operacion, permitido) {
  if (permitido) await assertSucceeds(operacion);
  else await assertFails(operacion);
  console.log(`OK: ${nombre}`);
}

const imagen = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const jpeg = { contentType: 'image/jpeg' };

async function main() {
  const env = await initializeTestEnvironment({
    projectId: 'demo-campusfind',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
    storage: { rules: fs.readFileSync('storage.rules', 'utf8') }
  });

  try {
    // Datos base sin reglas: un admin, una estudiante y su reporte.
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'users/admin'), { role: 'admin' });
      await setDoc(doc(db, 'users/camilo'), { role: 'student' });
      await setDoc(doc(db, 'lostReports/reporte1'), { ownerUid: 'camilo' });
    });

    const auth = (uid) => env.authenticatedContext(uid, {
      email: `${uid}@uniandes.edu.co`, email_verified: true
    }).storage();
    const admin = auth('admin');
    const camilo = auth('camilo');
    const sofia = auth('sofia');
    const anonimo = env.unauthenticatedContext().storage();

    await check('Admin sube foto de objeto encontrado',
      uploadBytes(ref(admin, 'foundItems/objeto1.jpg'), imagen, jpeg), true);

    await check('Estudiante no sube foto de objeto encontrado',
      uploadBytes(ref(camilo, 'foundItems/objeto2.jpg'), imagen, jpeg), false);

    await check('Admin no sube archivos que no son imagen',
      uploadBytes(ref(admin, 'foundItems/objeto3.jpg'), imagen,
        { contentType: 'text/plain' }), false);

    await check('Usuario autenticado ve foto de objeto encontrado',
      getBytes(ref(sofia, 'foundItems/objeto1.jpg')), true);

    await check('Anónimo no ve foto de objeto encontrado',
      getBytes(ref(anonimo, 'foundItems/objeto1.jpg')), false);

    await check('Camilo sube la foto de su reporte',
      uploadBytes(ref(camilo, 'lostReports/reporte1.jpg'), imagen, jpeg), true);

    await check('Sofia no sube foto al reporte de Camilo',
      uploadBytes(ref(sofia, 'lostReports/reporte1.jpg'), imagen, jpeg), false);

    await check('No se sube foto de un reporte que no existe',
      uploadBytes(ref(camilo, 'lostReports/noExiste.jpg'), imagen, jpeg), false);

    await check('El nombre del archivo debe ser <reportId>.jpg',
      uploadBytes(ref(camilo, 'lostReports/reporte1.png'), imagen, jpeg), false);

    await check('Camilo ve la foto de su reporte',
      getBytes(ref(camilo, 'lostReports/reporte1.jpg')), true);

    await check('Admin ve la foto del reporte',
      getBytes(ref(admin, 'lostReports/reporte1.jpg')), true);

    await check('Sofia no ve la foto del reporte de Camilo',
      getBytes(ref(sofia, 'lostReports/reporte1.jpg')), false);

    console.log('RESULTADO: todas las pruebas de Storage pasaron');
  } finally {
    await env.cleanup();
  }
}

main().catch(error => {
  console.error('FALLÓ LA PRUEBA:', error);
  process.exitCode = 1;
});
