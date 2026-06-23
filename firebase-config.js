// Import the Firebase SDK modules from the CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Your live, registered Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDnej33wQp7wB6nGgBVgBsA-gVMRJHCqk", 
  authDomain: "meal-planner-af67e.firebaseapp.com",
  projectId: "meal-planner-af67e",
  storageBucket: "meal-planner-af67e.firebasestorage.app",
  messagingSenderId: "351792466290",
  appId: "1:351792466290:web:2b73762d3ac12c5752b5eb", // Your real App ID!
  measurementId: "G-542223235"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export the initialized services for your HTML pages
export const auth = getAuth(app);
export const db = getFirestore(app);
