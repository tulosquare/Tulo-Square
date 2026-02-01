// firebase.js - Tulo Square Firebase Configuration (Updated for Realtime Database)
import { initializeApp } from "firebase/app";
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
} from "firebase/auth";
import { getDatabase, ref, set, get, update, remove, push, onValue, off, query, orderByChild, equalTo, limitToLast } from "firebase/database";
import { getFirestore } from "firebase/firestore"; // Keep for future Firestore use

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
    
    // Update presence
    await updatePresence(user.uid, 'online');
    
    return { success: true, user };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Login with Google
 */
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in Realtime Database
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      // Create new user in Realtime Database
      await set(userRef, {
        profile: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          phoneNumber: user.phoneNumber || "",
          userType: "community_member",
          communityRole: "member",
          kycStatus: "pending",
          avatarUrl: user.photoURL || "",
          location: "",
          communityBio: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastLogin: Date.now()
        },
        preferences: {
          notifications: true,
          language: "en",
          privacy: "public"
        },
        squares: 0,
        role: "user"
      });
    } else {
      // Update last login
      await update(ref(db, `users/${user.uid}/profile`), {
        lastLogin: Date.now()
      });
    }
    
    // Update presence
    await updatePresence(user.uid, 'online');
    
    return { success: true, user };
  } catch (error) {
    console.error("Google login error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  try {
    if (auth.currentUser) {
      // Update presence to offline
      await updatePresence(auth.currentUser.uid, 'offline');
    }
    
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

// ==============================
// USER PROFILE FUNCTIONS (Realtime Database)
// ==============================

/**
 * Get user profile data from Realtime Database
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Get user profile error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile in Realtime Database
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    // Validate updates match our rules structure
    const validatedUpdates = {};
    
    if (updates.displayName) {
      validatedUpdates['profile/displayName'] = updates.displayName;
    }
    
    if (updates.phoneNumber) {
      validatedUpdates['profile/phoneNumber'] = updates.phoneNumber;
    }
    
    if (updates.location) {
      validatedUpdates['profile/location'] = updates.location;
    }
    
    if (updates.communityBio) {
      validatedUpdates['profile/communityBio'] = updates.communityBio;
    }
    
    // Always update timestamp
    validatedUpdates['profile/updatedAt'] = Date.now();
    
    await update(ref(db, `users/${userId}`), validatedUpdates);
    
    return { success: true };
  } catch (error) {
    console.error("Update user profile error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// SAVINGS CIRCLES (SQUARES) FUNCTIONS
// ==============================

/**
 * Create a new savings circle (Square) in Realtime Database
 */
export const createSquare = async (squareData, creatorId) => {
  try {
    const squareId = `square_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const joinCode = generateJoinCode();
    
    const squareRef = ref(db, `squares/${squareId}`);
    
    const squareObject = {
      name: squareData.name,
      description: squareData.description || "",
      creatorId: creatorId,
      members: {
        [creatorId]: {
          userId: creatorId,
          role: "leader",
          joinedAt: Date.now(),
          status: "active",
          contributions: 0
        }
      },
      totalContributions: 0,
      status: "forming",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      goalAmount: squareData.goalAmount || 0,
      currency: squareData.currency || "ZMK",
      contributionFrequency: squareData.contributionFrequency || "monthly",
      contributionAmount: squareData.contributionAmount || 0,
      minMembers: squareData.minMembers || 3,
      maxMembers: squareData.maxMembers || 12,
      memberCount: 1,
      isPublic: squareData.isPublic || false,
      joinCode: joinCode,
      location: squareData.location || "",
      category: squareData.category || "general"
    };
    
    await set(squareRef, squareObject);
    
    // Update user's squares count
    await update(ref(db, `users/${creatorId}`), {
      squares: incrementValue(1)
    });
    
    return { success: true, squareId, joinCode };
  } catch (error) {
    console.error("Create square error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get square by ID from Realtime Database
 */
export const getSquare = async (squareId) => {
  try {
    const squareRef = ref(db, `squares/${squareId}`);
    const snapshot = await get(squareRef);
    
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: "Square not found" };
  } catch (error) {
    console.error("Get square error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Join a square (Realtime Database version)
 */
export const joinSquare = async (squareId, userId, joinCode = null) => {
  try {
    const squareRef = ref(db, `squares/${squareId}`);
    const snapshot = await get(squareRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: "Square not found" };
    }
    
    const squareData = snapshot.val();
    
    // Check if square is private and requires join code
    if (!squareData.isPublic && squareData.joinCode !== joinCode) {
      return { success: false, error: "Invalid join code" };
    }
    
    // Check if user is already a member
    if (squareData.members && squareData.members[userId]) {
      return { success: false, error: "Already a member" };
    }
    
    // Add user to square members
    const memberPath = `members/${userId}`;
    await update(squareRef, {
      [memberPath]: {
        userId: userId,
        role: "member",
        joinedAt: Date.now(),
        status: "active",
        contributions: 0
      },
      memberCount: incrementValue(1),
      updatedAt: Date.now()
    });
    
    // Update user's squares count
    await update(ref(db, `users/${userId}`), {
      squares: incrementValue(1)
    });
    
    // Update square status if enough members
    if (squareData.memberCount + 1 >= (squareData.minMembers || 3)) {
      await update(squareRef, {
        status: "active"
      });
    }
    
    // Create notification
    await createNotification(userId, 'square_join', 
      `Joined ${squareData.name}`, 
      'You have successfully joined the savings circle.');
    
    return { success: true };
  } catch (error) {
    console.error("Join square error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Record a contribution to a square (Realtime Database)
 */
export const recordContribution = async (squareId, userId, amount, notes = "") => {
  try {
    const contributionId = `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contributionRef = ref(db, `squares/${squareId}/contributions/${contributionId}`);
    
    // Create contribution record
    await set(contributionRef, {
      userId: userId,
      amount: amount,
      recordedAt: Date.now(),
      verifiedAt: Date.now(),
      status: "verified",
      verifiedBy: "system",
      notes: notes,
      currency: "ZMK"
    });
    
    // Update square total contributions
    await update(ref(db, `squares/${squareId}`), {
      totalContributions: incrementValue(amount),
      updatedAt: Date.now()
    });
    
    // Update user's contributions in the square
    const memberPath = `members/${userId}/contributions`;
    await update(ref(db, `squares/${squareId}`), {
      [memberPath]: incrementValue(amount)
    });
    
    // Create notification for square members
    await createSquareNotification(squareId, 'new_contribution',
      'New Contribution',
      `A member contributed ZMW ${amount} to the square.`);
    
    return { success: true, contributionId };
  } catch (error) {
    console.error("Record contribution error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's squares from Realtime Database
 */
export const getUserSquares = async (userId) => {
  try {
    const squaresRef = ref(db, 'squares');
    const snapshot = await get(squaresRef);
    
    const squares = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const square = childSnapshot.val();
        const squareId = childSnapshot.key;
        
        // Check if user is a member of this square
        if (square.members && square.members[userId]) {
          squares.push({
            id: squareId,
            ...square
          });
        }
      });
    }
    
    return { success: true, squares };
  } catch (error) {
    console.error("Get user squares error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// BUSINESS FUNCTIONS (Realtime Database)
// ==============================

/**
 * Register a business in Realtime Database
 */
export const registerBusiness = async (businessData, ownerId) => {
  try {
    const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const businessRef = ref(db, `businesses/${businessId}`);
    
    const businessObject = {
      name: businessData.name,
      ownerId: ownerId,
      businessType: businessData.businessType || "other",
      verificationStatus: "pending",
      location: businessData.location || "",
      description: businessData.description || "",
      phoneNumber: businessData.phoneNumber || "",
      email: businessData.email || "",
      website: businessData.website || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalCommunitySupport: 0,
      activeProjects: 0,
      completedProjects: 0,
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      categories: businessData.categories || []
    };
    
    await set(businessRef, businessObject);
    
    // Update user to business owner
    await update(ref(db, `users/${ownerId}/profile`), {
      userType: "business_owner"
    });
    
    return { success: true, businessId };
  } catch (error) {
    console.error("Register business error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get business by ID from Realtime Database
 */
export const getBusiness = async (businessId) => {
  try {
    const businessRef = ref(db, `businesses/${businessId}`);
    const snapshot = await get(businessRef);
    
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: "Business not found" };
  } catch (error) {
    console.error("Get business error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a business project/opportunity in Realtime Database
 */
export const createBusinessProject = async (businessId, projectData) => {
  try {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const projectRef = ref(db, `businesses/${businessId}/projects/${projectId}`);
    
    const projectObject = {
      title: projectData.title,
      description: projectData.description || "",
      businessId: businessId,
      status: "seeking",
      goalAmount: projectData.goalAmount || 0,
      totalRaised: 0,
      squareCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deadline: projectData.deadline || null,
      isActive: true,
      rewards: projectData.rewards || [],
      images: projectData.images || []
    };
    
    await set(projectRef, projectObject);
    
    return { success: true, projectId };
  } catch (error) {
    console.error("Create business project error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Square pledges support to business project (Realtime Database)
 */
export const pledgeSupport = async (squareId, projectId, businessId, amount, commitmentType) => {
  try {
    const pledgeId = `pledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pledgeRef = ref(db, `businesses/${businessId}/projects/${projectId}/pledges/${pledgeId}`);
    
    // Create pledge record
    await set(pledgeRef, {
      squareId: squareId,
      projectId: projectId,
      amount: amount,
      commitmentType: commitmentType,
      status: "pledged",
      pledgedAt: Date.now(),
      commitmentDeadline: null,
      notes: ""
    });
    
    // Update project total pledged
    await update(ref(db, `businesses/${businessId}/projects/${projectId}`), {
      totalRaised: incrementValue(amount),
      squareCount: incrementValue(1)
    });
    
    // Record user-business interaction
    const squareRef = ref(db, `squares/${squareId}`);
    const squareSnapshot = await get(squareRef);
    
    if (squareSnapshot.exists()) {
      const squareData = squareSnapshot.val();
      const members = Object.values(squareData.members || {});
      
      // Record interaction for each member
      for (const member of members) {
        const interactionId = `interact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const interactionRef = ref(db, `user_business_interactions/${member.userId}/${businessId}/${interactionId}`);
        
        await set(interactionRef, {
          interactionType: "pledge",
          interactedAt: Date.now(),
          projectId: projectId,
          amount: amount
        });
      }
    }
    
    return { success: true, pledgeId };
  } catch (error) {
    console.error("Pledge support error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// NOTIFICATIONS & MESSAGING (Realtime Database)
// ==============================

/**
 * Create a notification in Realtime Database
 */
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationRef = ref(db, `notifications/${userId}/${notificationId}`);
    
    await set(notificationRef, {
      id: notificationId,
      type: type,
      title: title,
      message: message,
      data: data,
      isRead: false,
      createdAt: Date.now(),
      expiresAt: null
    });
    
    return { success: true, notificationId };
  } catch (error) {
    console.error("Create notification error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create notification for all square members
 */
export const createSquareNotification = async (squareId, type, title, message) => {
  try {
    const squareRef = ref(db, `squares/${squareId}`);
    const snapshot = await get(squareRef);
    
    if (snapshot.exists()) {
      const squareData = snapshot.val();
      const members = Object.keys(squareData.members || {});
      
      for (const memberId of members) {
        await createNotification(memberId, type, title, message, { squareId });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Create square notification error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user notifications from Realtime Database
 */
export const getUserNotifications = async (userId, limitCount = 20) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    const notifications = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        notifications.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }
    
    // Sort by creation date (newest first) and limit
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    
    return { success: true, notifications: notifications.slice(0, limitCount) };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark notification as read in Realtime Database
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    await update(ref(db, `notifications/${userId}/${notificationId}`), {
      isRead: true,
      readAt: Date.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// REAL-TIME FUNCTIONS
// ==============================

/**
 * Update user presence
 */
export const updatePresence = async (userId, status) => {
  try {
    const presenceRef = ref(db, `presence/${userId}`);
    
    await set(presenceRef, {
      status: status,
      lastSeen: Date.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Update presence error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Listen to square updates in real-time
 */
export const listenToSquare = (squareId, callback) => {
  const squareRef = ref(db, `squares/${squareId}`);
  
  const unsubscribe = onValue(squareRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.key, ...snapshot.val() });
    }
  });
  
  return unsubscribe;
};

/**
 * Listen to user's notifications in real-time
 */
export const listenToNotifications = (userId, callback) => {
  const notificationsRef = ref(db, `notifications/${userId}`);
  
  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    const notifications = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        notifications.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }
    
    callback(notifications);
  });
  
  return unsubscribe;
};

/**
 * Listen to typing indicators
 */
export const listenToTyping = (squareId, callback) => {
  const typingRef = ref(db, `typing_indicators/${squareId}`);
  
  const unsubscribe = onValue(typingRef, (snapshot) => {
    const typingUsers = {};
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        typingUsers[childSnapshot.key] = childSnapshot.val();
      });
    }
    
    callback(typingUsers);
  });
  
  return unsubscribe;
};

/**
 * Set typing indicator
 */
export const setTyping = async (squareId, userId, isTyping) => {
  try {
    const typingRef = ref(db, `typing_indicators/${squareId}/${userId}`);
    
    if (isTyping) {
      await set(typingRef, true);
      
      // Auto-clear after 3 seconds
      setTimeout(() => {
        remove(typingRef).catch(console.error);
      }, 3000);
    } else {
      await remove(typingRef);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Set typing error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// PUBLIC DATA FUNCTIONS
// ==============================

/**
 * Get featured businesses from Realtime Database
 */
export const getFeaturedBusinesses = async () => {
  try {
    const businessesRef = ref(db, 'businesses');
    const snapshot = await get(businessesRef);
    
    const businesses = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const business = childSnapshot.val();
        
        // Only include verified businesses
        if (business.verificationStatus === 'verified' && business.isFeatured) {
          businesses.push({
            id: childSnapshot.key,
            ...business
          });
        }
      });
    }
    
    return { success: true, businesses };
  } catch (error) {
    console.error("Get featured businesses error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get public squares from Realtime Database
 */
export const getPublicSquares = async () => {
  try {
    const squaresRef = ref(db, 'squares');
    const snapshot = await get(squaresRef);
    
    const squares = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const square = childSnapshot.val();
        
        // Only include public squares
        if (square.isPublic && square.status === 'active') {
          squares.push({
            id: childSnapshot.key,
            ...square
          });
        }
      });
    }
    
    return { success: true, squares };
  } catch (error) {
    console.error("Get public squares error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// HELPER FUNCTIONS
// ==============================

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

/**
 * Helper function to increment values (for Realtime Database)
 */
function incrementValue(value) {
  // In Realtime Database, we use Firebase's increment
  // For now, we'll return the value and handle it in the update
  return value;
}

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount, currency = 'ZMK') => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Clean up database references on unmount
 */
export const cleanupListener = (unsubscribe) => {
  if (unsubscribe && typeof unsubscribe === 'function') {
    unsubscribe();
  }
};

// ==============================
// ERROR HANDLING
// ==============================

/**
 * Handle Firebase errors
 */
export const handleFirebaseError = (error) => {
  const errorCode = error.code;
  let userMessage = "An error occurred. Please try again.";
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      userMessage = "This email is already registered.";
      break;
    case 'auth/invalid-email':
      userMessage = "Invalid email address.";
      break;
    case 'auth/weak-password':
      userMessage = "Password should be at least 6 characters.";
      break;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      userMessage = "Invalid email or password.";
      break;
    case 'auth/too-many-requests':
      userMessage = "Too many attempts. Please try again later.";
      break;
    case 'permission-denied':
      userMessage = "You don't have permission to perform this action.";
      break;
    case 'unavailable':
      userMessage = "Network error. Please check your connection.";
      break;
    default:
      userMessage = error.message || userMessage;
  }
  
  return userMessage;
};

// Export Firebase services for direct access
export { app, auth, db, firestore };