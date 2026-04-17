// src/firebase.js
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

let db;

export function initFirebase() {
  let credential;

  // On Render: GOOGLE_APPLICATION_CREDENTIALS_JSON env var holds the JSON string
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local dev: path to service account JSON file
    const keyPath = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    credential = admin.credential.cert(serviceAccount);
  } else {
    throw new Error("No Firebase credentials found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON on Render.");
  }

  admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
  db = admin.firestore();
  console.log("✅ Firebase connected");
  return db;
}

export function getDb() {
  if (!db) throw new Error("Firebase not initialised");
  return db;
}
