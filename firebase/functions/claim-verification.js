// BQ Camilo (Type 3): "How does the successful ownership-verification rate differ between
// reports that include private identifying characteristics and those that do not?"
// Same scoring as the Kotlin ClaimMatcher. The private collections stay private: only
// the outcome (score, verdict, whether the report had a private detail) is written to
// claimVerifications, which is what BigQuery exports.

const LIKELY = 0.6;
const PARTIAL = 0.3;

function words(text) {
  return new Set(
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)
  );
}

function compareClaim(registered, answer) {
  const expected = words(registered);
  const given = words(answer);
  const score = expected.size === 0 ? 0 : [...expected].filter(w => given.has(w)).length / expected.size;
  const verdict = score >= LIKELY ? 'LIKELY_MATCH' : score >= PARTIAL ? 'PARTIAL_MATCH' : 'NO_MATCH';
  return { score, verdict };
}

// Claims whose ids are malformed are skipped, as in OwnershipRatesRepository.kt.
const validId = id => typeof id === 'string' && id.trim() !== '' && !id.includes('/');

async function computeClaimVerifications(db) {
  const claims = await db.collection('claims').get();
  const results = [];
  for (const claim of claims.docs) {
    const { reportId, foundItemId } = claim.data();
    if (!validId(reportId) || !validId(foundItemId)) continue;
    const [privateClaim, privateItem, privateReport] = await Promise.all([
      db.doc(`claimPrivate/${claim.id}`).get(),
      db.doc(`foundItemPrivate/${foundItemId}`).get(),
      db.doc(`lostReportPrivate/${reportId}`).get()
    ]);
    const { score, verdict } = compareClaim(
      privateItem.get('privateCharacteristics'),
      privateClaim.get('ownershipAnswer')
    );
    results.push({
      claimId: claim.id,
      reportId,
      hasPrivateDetail: privateReport.exists,
      score,
      verdict
    });
  }
  return results;
}

module.exports = { compareClaim, computeClaimVerifications };
