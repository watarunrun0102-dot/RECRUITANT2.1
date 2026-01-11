import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWFkgYXyxaLkkNTFG1Uimry4LQywrhf1A",
  authDomain: "recruitant2.firebaseapp.com",
  projectId: "recruitant2",
  storageBucket: "recruitant2.firebasestorage.app",
  messagingSenderId: "955682227692",
  appId: "1:955682227692:web:e9d67f855b519907816cc9",
  measurementId: "G-J3RBS98T2C"
};

// Initialize App using compat (v8-style) entry point
const app = firebase.initializeApp(firebaseConfig);

// Export Auth instance (compat)
export const auth = firebase.auth();

// Export Firestore instance (modular)
// Using getFirestore() with no arguments uses the default app initialized above
export const db = getFirestore();