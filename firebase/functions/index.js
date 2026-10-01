const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');

const { computeFeatureUsage } = require('./feature-usage');

initializeApp();

// Analytics pipeline: featureUsageEvents -> analytics/featureUsage.
exports.aggregateFeatureUsage = onSchedule(
  { schedule: 'every 1 hours', timeZone: 'America/Bogota', region: 'us-east1' },
  async () => {
    const db = getFirestore();
    const usage = await computeFeatureUsage(db);
    await db.doc('analytics/featureUsage').set({
      ...usage,
      computedAt: FieldValue.serverTimestamp()
    });
    logger.info('Feature usage aggregated', {
      eventCount: usage.eventCount,
      mostUsedFeature: usage.mostUsedFeature
    });
  }
);
