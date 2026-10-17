const test = require('node:test');
const assert = require('node:assert');
const { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } = require('jose');

const {
  CAMPUSFIND_CLIENT_ID, UNIANDES_TENANT_ID, firebaseUserFor, verifyMicrosoftIdToken
} = require('./microsoft-token');

const ISSUER = `https://login.microsoftonline.com/${UNIANDES_TENANT_ID}/v2.0`;

async function keyPair() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256' };
  return { privateKey, keys: createLocalJWKSet({ keys: [jwk] }) };
}

function sign(privateKey, claims = {}, { issuer = ISSUER, audience = CAMPUSFIND_CLIENT_ID, expiresIn = '1h' } = {}) {
  return new SignJWT({
    tid: UNIANDES_TENANT_ID,
    oid: 'oid-123',
    email: 'Ja.Student@uniandes.edu.co',
    name: 'Ja Student',
    ...claims
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

test('a valid Uniandes token gives the identity with a lowercase email', async () => {
  const { privateKey, keys } = await keyPair();
  const identity = await verifyMicrosoftIdToken(await sign(privateKey), { keys });
  assert.deepStrictEqual(identity, {
    oid: 'oid-123', email: 'ja.student@uniandes.edu.co', name: 'Ja Student'
  });
});

test('preferred_username is used when the token has no email claim', async () => {
  const { privateKey, keys } = await keyPair();
  const token = await sign(privateKey, {
    email: undefined, preferred_username: 'ana@uniandes.edu.co'
  });
  assert.strictEqual((await verifyMicrosoftIdToken(token, { keys })).email,
    'ana@uniandes.edu.co');
});

test('tokens that are not for CampusFind and Uniandes are rejected', async () => {
  const { privateKey, keys } = await keyPair();
  const other = await keyPair();
  const cases = {
    'other app': await sign(privateKey, {}, { audience: 'another-client' }),
    'other issuer': await sign(privateKey, {}, {
      issuer: 'https://login.microsoftonline.com/other/v2.0'
    }),
    'other tenant claim': await sign(privateKey, { tid: 'other-tenant' }),
    'personal email': await sign(privateKey, { email: 'ana@gmail.com' }),
    'no object id': await sign(privateKey, { oid: undefined }),
    expired: await sign(privateKey, {}, { expiresIn: '-1m' }),
    'wrong signature': await sign(other.privateKey)
  };
  for (const [name, token] of Object.entries(cases)) {
    await assert.rejects(verifyMicrosoftIdToken(token, { keys }), undefined, name);
  }
  await assert.rejects(verifyMicrosoftIdToken('not-a-jwt', { keys }));
});

function fakeAuth(users = {}) {
  const calls = [];
  return {
    calls,
    users,
    async getUserByEmail(email) {
      const user = Object.values(users).find(candidate => candidate.email === email);
      if (!user) throw Object.assign(new Error('missing'), { code: 'auth/user-not-found' });
      return user;
    },
    async updateUser(uid, changes) {
      calls.push(['update', uid, changes]);
      Object.assign(users[uid], changes);
    },
    async createUser(user) {
      calls.push(['create', user.uid]);
      users[user.uid] = user;
    }
  };
}

const identity = { oid: 'oid-123', email: 'ana@uniandes.edu.co', name: 'Ana' };

test('a new student gets a verified Firebase user tied to the Microsoft id', async () => {
  const auth = fakeAuth();
  const uid = await firebaseUserFor(auth, identity);
  assert.strictEqual(uid, 'microsoft_oid-123');
  assert.deepStrictEqual(auth.users[uid], {
    uid, email: 'ana@uniandes.edu.co', emailVerified: true, displayName: 'Ana'
  });
});

test('an existing account with the same email is reused and verified', async () => {
  const auth = fakeAuth({
    'password-uid': { uid: 'password-uid', email: 'ana@uniandes.edu.co', emailVerified: false }
  });
  assert.strictEqual(await firebaseUserFor(auth, identity), 'password-uid');
  assert.deepStrictEqual(auth.calls, [['update', 'password-uid', { emailVerified: true }]]);
});

test('a verified existing account is not touched', async () => {
  const auth = fakeAuth({
    'password-uid': { uid: 'password-uid', email: 'ana@uniandes.edu.co', emailVerified: true }
  });
  assert.strictEqual(await firebaseUserFor(auth, identity), 'password-uid');
  assert.deepStrictEqual(auth.calls, []);
});
