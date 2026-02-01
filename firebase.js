// firebase.js - Tulo Square Firebase Configuration (Updated with CDN imports)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  push, 
  onValue, 
  off, 
  query, 
  orderByChild, 
  equalTo, 
  limitToLast,
  increment // ADD THIS IMPORT
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"; // Keep for future

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoNjsWHC2mE1cLm0c1rqdktwU9gpwl4nk",
  authDomain: "tulo-square.firebaseapp.com",
  projectId: "tulo-square",
  storageBucket: "tulo-square.firebasestorage.app",
  messagingSenderId: "674758195845",
  appId: "1:674758195845:web:ef2fb2178b950b1cde87ec",
  databaseURL: "https://tulo-square-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getDatabase(app); // Realtime Database
const firestore = getFirestore(app); // Firestore for future use

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// ==============================
// AUTHENTICATION FUNCTIONS
// ==============================

/**
 * Register a new user (Realtime Database version)
 */
export const registerUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name if provided
    if (userData.displayName) {
      await updateProfile(user, {
        displayName: userData.displayName
      });
    }
    
    // Create user in Realtime Database (following your rules structure)
    await set(ref(db, `users/${user.uid}`), {
      profile: {
        uid: user.uid,
        email: email,
        displayName: userData.displayName || "",
        phoneNumber: userData.phoneNumber || "",
        userType: userData.userType || "community_member",
        communityRole: "member",
        kycStatus: "pending",
        location: userData.location || "",
        communityBio: userData.communityBio || "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      preferences: {
        notifications: true,
        language: "en",
        privacy: "public"
      },
      squares: 0,
      role: "user" // Default role, admins can change this
    });
    
    return { success: true, user };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Login user with email/password
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login timestamp
    await update(ref(db, `users/${user.uid}/profile`), {
      lastLogin: Date.now()
    });
    
    return { success: true, user };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
};

// ... [KEEP ALL YOUR EXISTING FUNCTIONS AS THEY ARE] ...

// ==============================
// HELPER FUNCTIONS - UPDATED
// ==============================

/**
 * Helper function to increment values (for Realtime Database)
 * FIXED: Now uses Firebase's increment function
 */
function incrementValue(value) {
  return increment(value); // Use Firebase's actual increment
}

/**
 * Generate random join code for private squares
 */
function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ... [REST OF YOUR HELPER FUNCTIONS] ...

// ==============================
// EXPORTS
// ==============================

// Export Firebase services for direct access
export { 
  app, 
  auth, 
  db, 
  firestore,
  onAuthStateChanged // Added this export
};

// Export all functions
export {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  createSquare,
  getSquare,
  joinSquare,
  recordContribution,
  getUserSquares,
  registerBusiness,
  getBusiness,
  createBusinessProject,
  pledgeSupport,
  createNotification,
  createSquareNotification,
  getUserNotifications,
  markNotificationAsRead,
  updatePresence,
  listenToSquare,
  listenToNotifications,
  listenToTyping,
  setTyping,
  getFeaturedBusinesses,
  getPublicSquares,
  formatTimestamp,
  formatCurrency,
  cleanupListener,
  handleFirebaseError
};