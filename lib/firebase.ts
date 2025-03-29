// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Export the config separately if needed
export const firebaseConfig = {
  apiKey: "AIzaSyBXDeUqkvSrli6q2eLlX14q2Seq2HKItLc",
  authDomain: "synkro-791d3.firebaseapp.com",
  projectId: "synkro-791d3",
  storageBucket: "synkro-791d3.firebasestorage.app",
  messagingSenderId: "942393176811",
  appId: "1:942393176811:web:082133b2caec10df1784ae",
  measurementId: "G-86BXE2LSLC"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const functions = getFunctions(app, "europe-west2"); // Using London region

// Optional: Export the app instance if needed elsewhere
export { app };