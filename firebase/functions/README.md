# Email Notifications

Cloud Functions for external email notifications.

Initial flow:

Firestore notification
→ Cloud Function
→ users/{recipientUid}
→ external email service

API keys must stay in Firebase/backend secrets, never in Kotlin, Flutter or GitHub.