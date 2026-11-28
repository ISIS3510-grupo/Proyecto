
async function refreshDeliveryMethods(db, bigquery) {
  const [claims, deliveries] = await Promise.all([
    db.collection("claims")
      .where("status", "==", "delivered").get(),
    db.collection("walkInDeliveries").get()
  ]);

  const digital = new Set(
    claims.docs.map(doc => doc.get("foundItemId")).filter(Boolean)
  );

  const walkIn = new Set(
    deliveries.docs.map(doc => doc.get("foundItemId")).filter(Boolean)
  );

  const duplicates = [...digital].filter(id => walkIn.has(id));

  const query = `
    CREATE OR REPLACE TABLE
      \`campusfind-26ac2.campusfind_analytics.bq_delivery_methods\` AS
    SELECT
      delivery_method,
      total_items,
      ROUND(100 * SAFE_DIVIDE(
        total_items, SUM(total_items) OVER()
      ), 2) AS percentage
    FROM UNNEST([
      STRUCT('Digital claims' AS delivery_method,
             @digital AS total_items),
      STRUCT('Walk-in handoffs' AS delivery_method,
             @walkIn AS total_items)
    ])
  `;

  await bigquery.query({
    query,
    params: {
      digital: digital.size - duplicates.length,
      walkIn: walkIn.size - duplicates.length
    },
    location: "US"
  });
}

module.exports = { refreshDeliveryMethods };

