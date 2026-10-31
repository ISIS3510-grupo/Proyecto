const test = require('node:test');
const assert = require('node:assert');

const { compareClaim } = require('./claim-verification');

test('matches the Kotlin ClaimMatcher thresholds', () => {
  assert.deepStrictEqual(compareClaim('funda roja con sticker', 'Es una funda ROJA con un sticker'), {
    score: 1,
    verdict: 'LIKELY_MATCH'
  });
  assert.strictEqual(compareClaim('funda roja con sticker', 'funda azul').verdict, 'NO_MATCH');
  assert.strictEqual(compareClaim('funda roja sticker gato', 'funda roja').verdict, 'PARTIAL_MATCH');
});

test('ignores accents, punctuation and short words', () => {
  assert.strictEqual(compareClaim('Cámara, Sony!', 'camara sony').verdict, 'LIKELY_MATCH');
  assert.strictEqual(compareClaim('', 'anything').score, 0);
});
