import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

// Ensure Firebase is initialized only once
if (!admin.apps.length) {
  admin.initializeApp();
}

interface MessageData {
  chatId: string;
  messageId: string;
  text: string;
}

export const validateMessage = functions.https.onCall(
  { region: "europe-west2" },
  async (request: CallableRequest<MessageData>) => {
    const { data, auth } = request;
    console.log("Processing message:", data.messageId);

    if (!auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    
    if (!data?.chatId || !data?.messageId || !data?.text) {
      throw new functions.https.HttpsError("invalid-argument", "Missing fields");
    }

    const db = admin.firestore();
    const messageRef = db.doc(`chats/${data.chatId}/messages/${data.messageId}`);

    try {
      // Use transaction for atomic update
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(messageRef);
        if (!doc.exists) {
          throw new functions.https.HttpsError("not-found", "Message not found");
        }

        if (doc.data()?.status !== "sending") {
          throw new functions.https.HttpsError("failed-precondition", "Invalid message state");
        }

        transaction.update(messageRef, {
          status: "sent",
          validatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Error processing message:", error);

      // Ensure correct error typing
      const errorMessage = (error instanceof Error) ? error.message : "Unknown error";

      // Emergency fallback update
      await messageRef.set(
        {
          status: "failed",
          error: errorMessage,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      throw new functions.https.HttpsError("internal", `Processing failed: ${errorMessage}`);
    }
  }
);
