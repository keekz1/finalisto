import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authorization check
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    
    // Validate request body
    const { chatId, messageId, text } = req.body;
    if (!chatId || !messageId || !text) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Update Firestore
    const messageRef = admin.firestore()
      .collection('chats').doc(chatId)
      .collection('messages').doc(messageId);

    await messageRef.update({
      status: 'delivered',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}