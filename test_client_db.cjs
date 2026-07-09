const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');

const localConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(localConfig);
const db = getFirestore(app, localConfig.firestoreDatabaseId);

async function test() {
  try {
    await setDoc(doc(db, 'subscribers', 'test@test.com'), {
        email: 'test@test.com',
        timestamp: new Date().toISOString()
    }, { merge: true });
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
