import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxAIu56jBu1MZdAYLfqg2tra9JvPgDqKU",
  authDomain: "feelwise-c8106.firebaseapp.com",
  projectId: "feelwise-c8106",
  storageBucket: "feelwise-c8106.firebasestorage.app",
  messagingSenderId: "655008171343",
  appId: "1:655008171343:web:8295fb002865ecc2c8f13a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to Sign Up User
export async function signUpUser(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Function to check if email already exists
export async function checkEmailExists(email) {
  const methods = await fetchSignInMethodsForEmail(auth, email);
  return methods.length > 0;
}

// Export Firebase modules
export { auth, db };
