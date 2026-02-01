// firebase.js - Tulo Square Firebase Configuration
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
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  increment
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from "firebase/storage";
import { 
  getDatabase, 
  ref as dbRef, 
  set, 
  get, 
  update, 
  remove, 
  push,
  onValue,
  off
} from "firebase/database";

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
const db = getFirestore(app);
const storage = getStorage(app);
const realtimeDb = getDatabase(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// ==============================
// AUTHENTICATION FUNCTIONS
// ==============================

/**
 * Register a new user
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
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      displayName: userData.displayName || "",
      phoneNumber: userData.phoneNumber || "",
      userType: userData.userType || "community_member", // community_member, business_owner, community_leader
      communityRole: userData.communityRole || "member",
      profileComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      status: "active",
      kycStatus: "pending", // pending, verified, rejected
      avatarUrl: "",
      location: userData.location || "",
      communityBio: userData.communityBio || ""
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
    await updateDoc(doc(db, "users", user.uid), {
      lastLogin: serverTimestamp()
    });
    
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
    
    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        phoneNumber: user.phoneNumber || "",
        userType: "community_member",
        communityRole: "member",
        profileComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        status: "active",
        kycStatus: "pending",
        avatarUrl: user.photoURL || "",
        location: "",
        communityBio: ""
      });
    } else {
      // Update last login
      await updateDoc(doc(db, "users", user.uid), {
        lastLogin: serverTimestamp()
      });
    }
    
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
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// ==============================
// USER PROFILE FUNCTIONS
// ==============================

/**
 * Get user profile data
 */
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Get user profile error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Update user profile error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update user document with new avatar URL
    await updateDoc(doc(db, "users", userId), {
      avatarUrl: downloadURL,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error("Upload profile picture error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// SAVINGS CIRCLES (SQUARES) FUNCTIONS
// ==============================

/**
 * Create a new savings circle (Square)
 */
export const createSquare = async (squareData, creatorId) => {
  try {
    const squareRef = await addDoc(collection(db, "squares"), {
      ...squareData,
      creatorId: creatorId,
      members: [{
        userId: creatorId,
        role: "leader",
        joinedAt: serverTimestamp(),
        status: "active",
        contributions: 0
      }],
      totalContributions: 0,
      status: "forming", // forming, active, completed, cancelled
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      nextRotationDate: null,
      currentCycle: 1,
      memberCount: 1,
      isPublic: squareData.isPublic || false,
      joinCode: generateJoinCode() // For private squares
    });
    
    // Add square to user's squares array
    await updateDoc(doc(db, "users", creatorId), {
      squares: increment(1)
    });
    
    return { success: true, squareId: squareRef.id };
  } catch (error) {
    console.error("Create square error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get square by ID
 */
export const getSquare = async (squareId) => {
  try {
    const squareDoc = await getDoc(doc(db, "squares", squareId));
    if (squareDoc.exists()) {
      return { success: true, data: { id: squareDoc.id, ...squareDoc.data() } };
    }
    return { success: false, error: "Square not found" };
  } catch (error) {
    console.error("Get square error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Join a square
 */
export const joinSquare = async (squareId, userId, joinCode = null) => {
  try {
    const squareDoc = await getDoc(doc(db, "squares", squareId));
    if (!squareDoc.exists()) {
      return { success: false, error: "Square not found" };
    }
    
    const squareData = squareDoc.data();
    
    // Check if square is private and requires join code
    if (!squareData.isPublic && squareData.joinCode !== joinCode) {
      return { success: false, error: "Invalid join code" };
    }
    
    // Check if user is already a member
    const existingMember = squareData.members.find(m => m.userId === userId);
    if (existingMember) {
      return { success: false, error: "Already a member" };
    }
    
    // Add user to square members
    await updateDoc(doc(db, "squares", squareId), {
      members: [...squareData.members, {
        userId: userId,
        role: "member",
        joinedAt: serverTimestamp(),
        status: "active",
        contributions: 0
      }],
      memberCount: increment(1),
      updatedAt: serverTimestamp()
    });
    
    // Update user's squares count
    await updateDoc(doc(db, "users", userId), {
      squares: increment(1)
    });
    
    // Update square status if enough members
    if (squareData.memberCount + 1 >= squareData.minMembers) {
      await updateDoc(doc(db, "squares", squareId), {
        status: "active"
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Join square error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Record a contribution to a square
 */
export const recordContribution = async (squareId, userId, amount, transactionId) => {
  try {
    // Create contribution record
    const contributionRef = await addDoc(collection(db, "contributions"), {
      squareId: squareId,
      userId: userId,
      amount: amount,
      transactionId: transactionId,
      status: "verified", // verified, pending, disputed
      recordedAt: serverTimestamp(),
      verifiedAt: serverTimestamp(),
      verifiedBy: "system", // or userId of verifier
      notes: ""
    });
    
    // Update square total contributions
    await updateDoc(doc(db, "squares", squareId), {
      totalContributions: increment(amount),
      updatedAt: serverTimestamp()
    });
    
    // Update user's contributions in the square
    const squareDoc = await getDoc(doc(db, "squares", squareId));
    const squareData = squareDoc.data();
    const updatedMembers = squareData.members.map(member => {
      if (member.userId === userId) {
        return {
          ...member,
          contributions: member.contributions + amount
        };
      }
      return member;
    });
    
    await updateDoc(doc(db, "squares", squareId), {
      members: updatedMembers
    });
    
    return { success: true, contributionId: contributionRef.id };
  } catch (error) {
    console.error("Record contribution error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's squares
 */
export const getUserSquares = async (userId) => {
  try {
    const squaresQuery = query(
      collection(db, "squares"),
      where("members", "array-contains", { userId: userId, status: "active" })
    );
    
    const snapshot = await getDocs(squaresQuery);
    const squares = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, squares };
  } catch (error) {
    console.error("Get user squares error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// BUSINESS FUNCTIONS
// ==============================

/**
 * Register a business
 */
export const registerBusiness = async (businessData, ownerId) => {
  try {
    const businessRef = await addDoc(collection(db, "businesses"), {
      ...businessData,
      ownerId: ownerId,
      status: "pending", // pending, verified, active, suspended
      verificationStatus: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      totalCommunitySupport: 0,
      activeSquares: [],
      completedProjects: 0,
      rating: 0,
      reviewCount: 0,
      isFeatured: false
    });
    
    // Update user to business owner
    await updateDoc(doc(db, "users", ownerId), {
      userType: "business_owner",
      businessId: businessRef.id
    });
    
    return { success: true, businessId: businessRef.id };
  } catch (error) {
    console.error("Register business error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get business by ID
 */
export const getBusiness = async (businessId) => {
  try {
    const businessDoc = await getDoc(doc(db, "businesses", businessId));
    if (businessDoc.exists()) {
      return { success: true, data: { id: businessDoc.id, ...businessDoc.data() } };
    }
    return { success: false, error: "Business not found" };
  } catch (error) {
    console.error("Get business error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a business project/opportunity
 */
export const createBusinessProject = async (businessId, projectData) => {
  try {
    const projectRef = await addDoc(collection(db, "projects"), {
      ...projectData,
      businessId: businessId,
      status: "seeking", // seeking, funded, in_progress, completed, cancelled
      totalRaised: 0,
      squareCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deadline: projectData.deadline ? Timestamp.fromDate(new Date(projectData.deadline)) : null,
      isActive: true
    });
    
    return { success: true, projectId: projectRef.id };
  } catch (error) {
    console.error("Create business project error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Square pledges support to business project
 */
export const pledgeSupport = async (squareId, projectId, amount, commitmentType) => {
  try {
    const pledgeRef = await addDoc(collection(db, "pledges"), {
      squareId: squareId,
      projectId: projectId,
      amount: amount,
      commitmentType: commitmentType, // pre_purchase, funding, in_kind
      status: "pledged", // pledged, committed, completed, cancelled
      pledgedAt: serverTimestamp(),
      commitmentDeadline: null,
      notes: ""
    });
    
    // Update project total pledged
    await updateDoc(doc(db, "projects", projectId), {
      totalRaised: increment(amount),
      squareCount: increment(1)
    });
    
    return { success: true, pledgeId: pledgeRef.id };
  } catch (error) {
    console.error("Pledge support error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// FINANCIAL EDUCATION FUNCTIONS
// ==============================

/**
 * Get learning modules
 */
export const getLearningModules = async () => {
  try {
    const modulesQuery = query(
      collection(db, "learning_modules"),
      orderBy("order"),
      where("isPublished", "==", true)
    );
    
    const snapshot = await getDocs(modulesQuery);
    const modules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, modules };
  } catch (error) {
    console.error("Get learning modules error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark module as completed for user
 */
export const completeLearningModule = async (userId, moduleId) => {
  try {
    const completionRef = await addDoc(collection(db, "learning_completions"), {
      userId: userId,
      moduleId: moduleId,
      completedAt: serverTimestamp(),
      score: null, // if there's a quiz
      timeSpent: 0 // in minutes
    });
    
    // Update user's learning progress
    await updateDoc(doc(db, "users", userId), {
      completedModules: increment(1),
      lastLearningActivity: serverTimestamp()
    });
    
    return { success: true, completionId: completionRef.id };
  } catch (error) {
    console.error("Complete learning module error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// NOTIFICATIONS & MESSAGING
// ==============================

/**
 * Create a notification
 */
export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notificationRef = await addDoc(collection(db, "notifications"), {
      userId: userId,
      type: type, // square_update, business_update, system, community
      title: title,
      message: message,
      data: data,
      isRead: false,
      createdAt: serverTimestamp(),
      expiresAt: null
    });
    
    // Real-time update for immediate notification
    const userNotificationsRef = dbRef(realtimeDb, `notifications/${userId}/${notificationRef.id}`);
    await set(userNotificationsRef, {
      id: notificationRef.id,
      type: type,
      title: title,
      message: message,
      isRead: false,
      createdAt: Date.now()
    });
    
    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    console.error("Create notification error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId, limitCount = 20) => {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, notifications };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true,
      readAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// COMMUNITY FUNCTIONS
// ==============================

/**
 * Create community discussion
 */
export const createDiscussion = async (squareId, userId, title, content) => {
  try {
    const discussionRef = await addDoc(collection(db, "discussions"), {
      squareId: squareId,
      userId: userId,
      title: title,
      content: content,
      type: "general", // general, decision, announcement
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      upvotes: 0,
      commentCount: 0,
      isPinned: false
    });
    
    return { success: true, discussionId: discussionRef.id };
  } catch (error) {
    console.error("Create discussion error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Add comment to discussion
 */
export const addComment = async (discussionId, userId, content) => {
  try {
    const commentRef = await addDoc(collection(db, "comments"), {
      discussionId: discussionId,
      userId: userId,
      content: content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      upvotes: 0,
      isEdited: false
    });
    
    // Update discussion comment count
    await updateDoc(doc(db, "discussions", discussionId), {
      commentCount: increment(1),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, commentId: commentRef.id };
  } catch (error) {
    console.error("Add comment error:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// REAL-TIME FUNCTIONS
// ==============================

/**
 * Listen to square updates in real-time
 */
export const listenToSquare = (squareId, callback) => {
  const squareRef = doc(db, "squares", squareId);
  
  // Firestore listener
  const unsubscribe = onSnapshot(squareRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
  
  return unsubscribe;
};

/**
 * Listen to user's notifications in real-time
 */
export const listenToNotifications = (userId, callback) => {
  const notificationsRef = dbRef(realtimeDb, `notifications/${userId}`);
  
  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    const notifications = [];
    snapshot.forEach((childSnapshot) => {
      notifications.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    callback(notifications);
  });
  
  return () => off(notificationsRef, 'value', unsubscribe);
};

// ==============================
// ANALYTICS & STATS
// ==============================

/**
 * Get platform statistics
 */
export const getPlatformStats = async () => {
  try {
    // These would be aggregated in a separate stats collection
    // For now, return mock data or fetch from a stats document
    const statsDoc = await getDoc(doc(db, "platform_stats", "current"));
    
    if (statsDoc.exists()) {
      return { success: true, stats: statsDoc.data() };
    }
    
    // Default stats if no stats document exists
    return {
      success: true,
      stats: {
        totalUsers: 0,
        activeSquares: 0,
        totalBusinesses: 0,
        totalContributions: 0,
        communityImpact: 0,
        learningCompletions: 0
      }
    };
  } catch (error) {
    console.error("Get platform stats error:", error);
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
 * Format Firestore timestamp for display
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  return new Date(timestamp).toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
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

// Export Firebase services for direct access if needed
export { app, auth, db, storage, realtimeDb };