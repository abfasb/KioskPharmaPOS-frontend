import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

console.log(import.meta.env.VITE_APP_FIREBASE_API_KEY);

const firebaseConfig = {
  apiKey: "AIzaSyAV0OjXxPXCGE_u-PoIuIK8m07u-gZHKKU",
  authDomain: "kioskpharmapos.firebaseapp.com",
  projectId: "kioskpharmapos",
  storageBucket: "kioskpharmapos.appspot.com",
  messagingSenderId: "567845065039",
  appId: "1:567845065039:web:73ba53e580d809e3cfb53a",
  measurementId: "G-FZJY2D9196"
};



const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };





