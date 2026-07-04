import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC8SQdYbivjab4eXrnC1LCkwDCAobz3Rd4",
  authDomain: "gen-lang-client-0905895642.firebaseapp.com",
  projectId: "gen-lang-client-0905895642",
  storageBucket: "gen-lang-client-0905895642.firebasestorage.app",
  messagingSenderId: "161842932011",
  appId: "1:161842932011:web:d53ddde3ac6733a863bd6e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if provided
export const db = getFirestore(app, "ai-studio-ahmedgamalenglis-1406c3cc-51d4-4182-864f-1463a7234c63");
