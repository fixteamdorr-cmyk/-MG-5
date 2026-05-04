import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Use the provided database ID or default to '(default)'
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "" 
  ? firebaseConfig.firestoreDatabaseId 
  : "(default)";

export const db = getFirestore(app, dbId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Messaging might not be supported in all environments (e.g. some iframes)
export const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};
