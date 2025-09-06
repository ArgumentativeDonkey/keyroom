// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDF1gdF_s3qeBhGLdgJDg6gMuX6SGIgCj0",
  authDomain: "chat-9122b.firebaseapp.com",
  projectId: "chat-9122b",
  storageBucket: "chat-9122b.firebasestorage.app",
  messagingSenderId: "864094891560",
  appId: "1:864094891560:web:7fc6b7bd850bc6297ccf1d",
  measurementId: "G-02X6WE5Q0H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);