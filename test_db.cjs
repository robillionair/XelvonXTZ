const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const localConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
} else {
  initializeApp({
    projectId: localConfig.projectId
  });
}

const db = getFirestore(localConfig.firestoreDatabaseId);

async function test() {
  try {
    await db.collection('subscribers').doc('test@test.com').set({
        email: 'test@test.com',
        timestamp: new Date().toISOString()
    }, { merge: true });
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
