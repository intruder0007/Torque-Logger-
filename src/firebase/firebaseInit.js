import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadServiceAccount() {
  // Support both file path and inline JSON env var
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const filePath = join(__dirname, '..', '..', 'serviceAccount.json');
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error(
      'Firebase credentials not found. Provide serviceAccount.json at project root ' +
      'or set FIREBASE_SERVICE_ACCOUNT_JSON env variable.'
    );
  }
}

let db;

export function initFirebase() {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  const serviceAccount = loadServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  logger.info(`Firebase initialized: project=${serviceAccount.project_id}`);
  return db;
}

export function getFirestore() {
  if (!db) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return db;
}

export { admin };
