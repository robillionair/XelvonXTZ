const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/import \{ getFirestore as getClientFirestore, doc, setDoc, getDoc \} from 'firebase\/firestore';/, "import { getFirestore as getClientFirestore, doc, setDoc, getDoc } from 'firebase/firestore/lite';");
fs.writeFileSync('server.ts', code);
