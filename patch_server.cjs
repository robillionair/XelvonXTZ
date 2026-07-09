const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import \{ getFirestore, collection, doc, setDoc \} from 'firebase\/firestore';/, "import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';");

code = code.replace(
  /const doc = await db\.collection\('chats'\)\.doc\(email\)\.get\(\);/g,
  "const chatDoc = await getDoc(doc(db, 'chats', email));"
);
code = code.replace(
  /if \(doc\.exists\) \{/g,
  "if (chatDoc.exists()) {"
);
code = code.replace(
  /return res\.json\(\{ messages: doc\.data\(\)\?\.messages \|\| \[\] \}\);/g,
  "return res.json({ messages: chatDoc.data()?.messages || [] });"
);

code = code.replace(
  /await db\.collection\('subscribers'\)\.doc\(normalizedEmail\)\.set\(\{/g,
  "await setDoc(doc(db, 'subscribers', normalizedEmail), {"
);

code = code.replace(
  /await db\.collection\('chats'\)\.doc\(normalizedEmail\)\.set\(\{/g,
  "await setDoc(doc(db, 'chats', normalizedEmail), {"
);

fs.writeFileSync('server.ts', code);
