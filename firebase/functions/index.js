const { onDocumentCreated } =
  require("firebase-functions/v2/firestore");

const { defineSecret } =
  require("firebase-functions/params");

const { initializeApp } =
  require("firebase-admin/app");

const { getFirestore } =
  require("firebase-admin/firestore");

const { Resend } =
  require("resend");

initializeApp();

const db =
  getFirestore();

const RESEND_API_KEY =
  defineSecret("RESEND_API_KEY");

exports.sendPossibleMatchEmail =
  onDocumentCreated(
    {
      document: "notifications/{notificationId}",
      secrets: [RESEND_API_KEY]
    },
    async (event) => {

      const snapshot =
        event.data;

      if (!snapshot) {
        console.log(
          "Notification document does not exist."
        );
        return;
      }

      const notification =
        snapshot.data();

      const recipientUid =
        notification.recipientUid;

      const matchId =
        notification.matchId;

      if (!recipientUid) {
        console.log(
          "Notification has no recipientUid."
        );
        return;
      }

      if (!matchId) {
        console.log(
          "Notification has no matchId."
        );
        return;
      }

      const userSnapshot =
        await db
          .collection("users")
          .doc(recipientUid)
          .get();

      if (!userSnapshot.exists) {
        console.log(
          `User ${recipientUid} does not exist.`
        );
        return;
      }

      const user =
        userSnapshot.data();

      const email =
        user.email;

      if (!email) {
        console.log(
          `User ${recipientUid} has no email.`
        );
        return;
      }

      const resend =
        new Resend(
          RESEND_API_KEY.value()
        );

      const {
        data,
        error
      } =
        await resend.emails.send({
          from:
            "CampusFind <onboarding@resend.dev>",

          to: [
            email
          ],

          subject:
            "Possible match found",

          html: `
            <h2>Possible match found</h2>

            <p>
              CampusFind found an item that
              may match your lost-item report.
            </p>

            <p>
              Open CampusFind to review
              the possible match.
            </p>

            <p>
              Match ID:
              <strong>${matchId}</strong>
            </p>
          `
        });

      if (error) {
        console.error(
          "Resend error:",
          error
        );

        throw new Error(
          "Email could not be sent."
        );
      }

      console.log(
        "Email sent successfully:",
        data
      );
    }
  );

// BQ Jhostin (Type 3): which features students use the most.
// Analytics pipeline: featureUsageEvents -> analytics/featureUsage, every hour.
const { onSchedule } =
  require("firebase-functions/v2/scheduler");

const { FieldValue } =
  require("firebase-admin/firestore");

const logger =
  require("firebase-functions/logger");

const { computeFeatureUsage } =
  require("./feature-usage");

exports.aggregateFeatureUsage =
  onSchedule(
    {
      schedule: "every 1 hours",
      timeZone: "America/Bogota",
      region: "us-east1"
    },
    async () => {
      const usage =
        await computeFeatureUsage(db);

      await db.doc("analytics/featureUsage").set({
        ...usage,
        computedAt: FieldValue.serverTimestamp()
      });

      logger.info("Feature usage aggregated", {
        eventCount: usage.eventCount,
        mostUsedFeature: usage.mostUsedFeature
      });
    }
  );

// External service (Jhostin): Google Cloud Vision reads the photo of a lost
// item and suggests its category and a short description before the student
// sends the report. Called from Flutter with the compressed photo in base64.
const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const { ImageAnnotatorClient } =
  require("@google-cloud/vision");

const { suggestFromAnnotation } =
  require("./photo-labels");

// The app sends photos of at most 1280 px at quality 70 (about 300 KB);
// 2 MB of base64 leaves room without accepting arbitrary files.
const MAX_PHOTO_BASE64_LENGTH =
  2 * 1024 * 1024;

const UNIANDES_EMAIL =
  /^[^@]+@uniandes\.edu\.co$/;

let visionClient;

exports.suggestPhotoLabels =
  onCall(
    {
      region: "us-east1",
      memory: "512MiB",
      timeoutSeconds: 30,
      maxInstances: 5
    },
    async (request) => {
      // Same condition as campusUser() in firestore.rules.
      const token =
        request.auth?.token;

      if (
        !token ||
        token.email_verified !== true ||
        !UNIANDES_EMAIL.test(token.email || "")
      ) {
        throw new HttpsError(
          "unauthenticated",
          "Sign in with a verified Uniandes account."
        );
      }

      const image =
        request.data?.image;

      if (
        typeof image !== "string" ||
        image.length === 0 ||
        image.length > MAX_PHOTO_BASE64_LENGTH
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Send one compressed photo in base64."
        );
      }

      visionClient ??=
        new ImageAnnotatorClient();

      let annotation;
      try {
        [annotation] =
          await visionClient.annotateImage({
            image: { content: image },
            features: [
              { type: "LABEL_DETECTION", maxResults: 10 },
              { type: "TEXT_DETECTION" },
              { type: "IMAGE_PROPERTIES" }
            ]
          });
      } catch (error) {
        logger.error("Vision request failed", error);
        throw new HttpsError(
          "unavailable",
          "The photo could not be analyzed right now."
        );
      }

      if (annotation.error?.message) {
        logger.warn("Vision could not annotate the photo", {
          message: annotation.error.message
        });
        throw new HttpsError(
          "unavailable",
          "The photo could not be analyzed right now."
        );
      }

      // Only the suggestion goes back; the photo is not stored here.
      return suggestFromAnnotation(annotation);
    }
  );
