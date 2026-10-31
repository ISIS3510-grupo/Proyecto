// Microsoft single sign-on (Jhostin). The Flutter app signs in with MSAL and
// sends the Microsoft ID token; Firebase cannot accept that token directly, so
// this module verifies it and finds the Firebase user it belongs to. index.js
// then answers with a Firebase custom token.
const { jwtVerify, createRemoteJWKSet } = require("jose");

// Microsoft Entra tenant of Universidad de los Andes and the CampusFind app.
const UNIANDES_TENANT_ID = "fabd047c-ff48-492a-8bbb-8f98b9fb9cca";
const CAMPUSFIND_CLIENT_ID = "5b31e76c-0ade-4ea2-bb00-9a3d180dfd4b";

const UNIANDES_EMAIL = /^[^@\s]+@uniandes\.edu\.co$/;

let tenantKeys;

// Public keys Microsoft signs the tenant tokens with (cached by jose).
function uniandesKeys() {
  tenantKeys ??= createRemoteJWKSet(new URL(
    `https://login.microsoftonline.com/${UNIANDES_TENANT_ID}/discovery/v2.0/keys`));
  return tenantKeys;
}

// Throws unless the token was signed by Microsoft for CampusFind, belongs to
// the Uniandes tenant, has not expired and carries a Uniandes email.
async function verifyMicrosoftIdToken(idToken, options = {}) {
  const tenantId = options.tenantId || UNIANDES_TENANT_ID;
  const { payload } = await jwtVerify(idToken, options.keys || uniandesKeys(), {
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    audience: options.clientId || CAMPUSFIND_CLIENT_ID,
    algorithms: ["RS256"],
    currentDate: options.currentDate
  });

  if (payload.tid !== tenantId) {
    throw new Error("The account is not from the Uniandes tenant.");
  }
  const email = String(payload.email || payload.preferred_username || "")
    .trim().toLowerCase();
  if (!UNIANDES_EMAIL.test(email)) {
    throw new Error("The account has no Uniandes email.");
  }
  if (typeof payload.oid !== "string" || payload.oid.length === 0) {
    throw new Error("The token has no Microsoft object id.");
  }
  return {
    oid: payload.oid,
    email,
    name: typeof payload.name === "string" ? payload.name : null
  };
}

// Firebase uid for a verified Microsoft identity. A student who already has an
// account with the same email keeps it; Microsoft has just proved the email,
// so it is marked as verified (the rules require email_verified).
async function firebaseUserFor(auth, identity) {
  try {
    const existing = await auth.getUserByEmail(identity.email);
    if (!existing.emailVerified) {
      await auth.updateUser(existing.uid, { emailVerified: true });
    }
    return existing.uid;
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }

  const uid = `microsoft_${identity.oid}`;
  await auth.createUser({
    uid,
    email: identity.email,
    emailVerified: true,
    ...(identity.name ? { displayName: identity.name } : {})
  });
  return uid;
}

module.exports = {
  CAMPUSFIND_CLIENT_ID,
  UNIANDES_TENANT_ID,
  firebaseUserFor,
  verifyMicrosoftIdToken
};
