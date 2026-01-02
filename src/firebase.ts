import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHUhI24GTJHxFqaFTBn1Nua9vqkXv_EEQ",
  authDomain: "journalimageconverter.firebaseapp.com",
  projectId: "journalimageconverter",
  storageBucket: "journalimageconverter.firebasestorage.app",
  messagingSenderId: "6612508068",
  appId: "1:6612508068:web:24a3113f4d372769d6b531",
  measurementId: "G-KBXNWXHJHG",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;

import { signOut } from "firebase/auth";

export const handleLogout = async () => {
  try {
    await signOut(auth);
    window.location.reload(); // or redirect to login page
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
