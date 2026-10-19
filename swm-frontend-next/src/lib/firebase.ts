import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

/**
 * Firebase Realtime Database Configuration
 * Matching existing production deployment parameters
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDqDKiX2fPyU81XpOCVPTYeFCn7-WkgmoY",
  authDomain: "smart-waste-management-49d88.firebaseapp.com",
  databaseURL: "https://smart-waste-management-49d88-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-waste-management-49d88",
  storageBucket: "smart-waste-management-49d88.firebasestorage.app",
  messagingSenderId: "459528260282",
  appId: "1:459528260282:web:d7161b9ec227621c3c1083",
};

// Singleton Firebase App initialization
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const database = getDatabase(app);
