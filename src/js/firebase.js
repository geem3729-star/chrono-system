import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3YOrV6h6gYkPa6O1SaSJXbAemmfMu3Lg",
    authDomain: "chronos-system-e3d4c.firebaseapp.com",
    databaseURL: "https://chronos-system-e3d4c-default-rtdb.firebaseio.com",
    projectId: "chronos-system-e3d4c",
    storageBucket: "chronos-system-e3d4c.firebasestorage.app",
    messagingSenderId: "314230379065",
    appId: "1:314230379065:web:22827183f5e4cb7f7173e8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const provider = new GoogleAuthProvider();
export { ref, set, get, child, onValue, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut };