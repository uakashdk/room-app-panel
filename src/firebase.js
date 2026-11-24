import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup and configuration.
// Paste YOUR apiKey and appId. (These are not secrets; the security comes from Firestore rules.)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCT7vANUTkjl9DObBTnh3FXx7i404W-23Y",
  authDomain: "desi-vox.firebaseapp.com",
  projectId: "desi-vox",
  storageBucket: "desi-vox.firebasestorage.app",
  messagingSenderId: "788210772055",
  appId: "1:788210772055:web:5865326e082f7f3e179b12",
  measurementId: "G-B81CP8R5H8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
