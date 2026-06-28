import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAvUGYcq6gcB86ZscmRxNpYFcq07mHCWUg",
  authDomain: "studyai-fc82c.firebaseapp.com",
  projectId: "studyai-fc82c",
  storageBucket: "studyai-fc82c.firebasestorage.app",
  messagingSenderId: "103568582126",
  appId: "1:103568582126:web:19e82337e3fe2727769aff",
  measurementId: "G-LCY263PM6B",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;