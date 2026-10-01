// BQ Jhostin (Type 3): "Which app features are used most frequently by students?"
// Counts featureUsageEvents per feature (total, last 7 days and per platform).

const FEATURES = [
  'search_found_items',
  'report_lost_item',
  'submit_lost_report',
  'report_found_item',
  'view_my_report',
  'password_login',
  'biometric_login'
];

const PLATFORMS = ['flutter', 'kotlin'];

const DAY_MS = 24 * 60 * 60 * 1000;

async function countWhere(query) {
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

// Uses count() aggregation queries, so it does not read every event document.
async function computeFeatureUsage(db, now = new Date()) {
  const events = db.collection('featureUsageEvents');
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const totals = {};
  const last7Days = {};
  const byPlatform = Object.fromEntries(PLATFORMS.map(p => [p, {}]));

  for (const feature of FEATURES) {
    const ofFeature = events.where('feature', '==', feature);
    totals[feature] = await countWhere(ofFeature);
    last7Days[feature] = await countWhere(ofFeature.where('occurredAt', '>=', weekAgo));
    for (const platform of PLATFORMS) {
      byPlatform[platform][feature] = await countWhere(ofFeature.where('platform', '==', platform));
    }
  }

  const ranking = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([feature, count]) => ({ feature, count }));

  return {
    totals,
    last7Days,
    byPlatform,
    ranking,
    mostUsedFeature: ranking[0] && ranking[0].count > 0 ? ranking[0].feature : null,
    eventCount: Object.values(totals).reduce((sum, count) => sum + count, 0)
  };
}

module.exports = { FEATURES, PLATFORMS, computeFeatureUsage };
