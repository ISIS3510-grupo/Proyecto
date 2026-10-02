const test = require('node:test');
const assert = require('node:assert');

const { FEATURES, computeFeatureUsage } = require('./feature-usage');

// Minimal fake of the Firestore query API used by computeFeatureUsage.
function fakeDb(events) {
  const query = filters => ({
    where: (field, op, value) => query([...filters, { field, op, value }]),
    count: () => ({
      get: async () => ({
        data: () => ({
          count: events.filter(event => filters.every(({ field, op, value }) =>
            op === '==' ? event[field] === value : event[field] >= value)).length
        })
      })
    })
  });
  return { collection: () => query([]) };
}

test('counts uses per feature, last 7 days and platform', async () => {
  const now = new Date('2026-10-01T12:00:00Z');
  const recent = new Date('2026-09-30T12:00:00Z');
  const old = new Date('2026-09-01T12:00:00Z');
  const db = fakeDb([
    { feature: 'report_lost_item', platform: 'flutter', occurredAt: recent },
    { feature: 'report_lost_item', platform: 'kotlin', occurredAt: old },
    { feature: 'search_found_items', platform: 'flutter', occurredAt: recent }
  ]);

  const usage = await computeFeatureUsage(db, now);

  assert.strictEqual(usage.totals.report_lost_item, 2);
  assert.strictEqual(usage.last7Days.report_lost_item, 1);
  assert.strictEqual(usage.byPlatform.kotlin.report_lost_item, 1);
  assert.strictEqual(usage.mostUsedFeature, 'report_lost_item');
  assert.strictEqual(usage.eventCount, 3);
  assert.strictEqual(Object.keys(usage.totals).length, FEATURES.length);
});

test('has no most used feature when there are no events', async () => {
  const usage = await computeFeatureUsage(fakeDb([]));
  assert.strictEqual(usage.mostUsedFeature, null);
  assert.strictEqual(usage.eventCount, 0);
});
