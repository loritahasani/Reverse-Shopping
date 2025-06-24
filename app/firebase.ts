// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyC6yRWf1Oo_PY-y0nX6l8qrIBAXWfdEfV0",
    authDomain: "reverseshooping.firebaseapp.com",
    projectId: "reverseshooping",
    storageBucket: "reverseshooping.appspot.com",
    messagingSenderId: "807045364369",
    appId: "1:807045364369:web:e44cd5cbd9e44bc2505d30",
    measurementId: "G-ZLS9XGZ28E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, storage };
