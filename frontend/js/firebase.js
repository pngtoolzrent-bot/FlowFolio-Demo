// js/firebase.js
// Firebase config is injected at runtime from config.js (gitignored)
// For GitHub Pages, set these values in js/config.js
// NEVER commit real API keys — use environment secrets on your CI/CD

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Load config from window.FIREBASE_CONFIG (set by config.js)
const firebaseConfig = window.FIREBASE_CONFIG;

let app, db;

try {
  app = initializeApp(firebaseConfig);
  db  = getFirestore(app);
} catch (e) {
  console.error("Firebase init failed:", e);
}

export { db };
