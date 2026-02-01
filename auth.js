// auth.js - Updated for Tulo Square
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  set,
  get,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* =========================
   SIGNUP FOR TULO SQUARE
========================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form values
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();
    const referralSource = document.getElementById("referralSource")?.value || "other";
    const referralCode = document.getElementById("referralCode")?.value.trim() || null;

    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");
    const submitBtn = document.getElementById("signupBtn");

    // Clear previous messages
    errorEl.textContent = "";
    errorEl.style.display = "none";
    successEl.textContent = "";
    successEl.style.display = "none";

    // Validation
    if (!name || !email || !phone || !password) {
      showError(errorEl, "Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      showError(errorEl, "Password must be at least 6 characters");
      return;
    }

    // Format phone number
    const formattedPhone = '+260' + phone.replace(/\D/g, '');

    // Disable button and show loading
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }

    try {
      // 1. Create user in Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // 2. Generate Tulo Square referral code
      const myReferralCode = "TULO" + Math.floor(100000 + Math.random() * 900000);

      // 3. Save user data to Realtime Database
      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        phone: formattedPhone,
        referralCode: myReferralCode,
        referralSource,
        referredBy: referralCode,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        squares: {}, // Will hold square IDs the user belongs to
        role: "member",
        status: "active"
      });

      // 4. If there's a referral code, log the referral
      if (referralCode) {
        await set(ref(db, `referrals/${referralCode}/${user.uid}`), {
          newUserEmail: email,
          newUserName: name,
          referredAt: serverTimestamp()
        });
      }

      // 5. Show success message
      showSuccess(successEl, "Account created successfully! Welcome to Tulo Square.");
      
      // 6. Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 2000);

    } catch (err) {
      // Handle errors
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Join Tulo Square';
      }

      let errorMessage = "Error creating account. ";
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage += "This email is already registered.";
          break;
        case 'auth/invalid-email':
          errorMessage += "Invalid email address.";
          break;
        case 'auth/weak-password':
          errorMessage += "Password is too weak.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage += "Email/password accounts are not enabled. Please contact support.";
          break;
        default:
          errorMessage += err.message.replace("Firebase: ", "");
      }

      showError(errorEl, errorMessage);
    }
  });
}

/* =========================
   LOGIN FOR TULO SQUARE
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errorEl = document.getElementById("loginError");
    const submitBtn = document.getElementById("loginBtn");

    // Clear previous messages
    errorEl.textContent = "";
    errorEl.style.display = "none";

    // Disable button and show loading
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    try {
      // 1. Sign in user
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // 2. Update last login timestamp
      await update(ref(db, `users/${user.uid}`), {
        lastLogin: serverTimestamp()
      });

      // 3. Redirect to dashboard
      window.location.href = "dashboard.html";

    } catch (err) {
      // Handle errors
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
      }

      let errorMessage = "Login failed. ";
      
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage += "Invalid email or password.";
          break;
        case 'auth/invalid-email':
          errorMessage += "Invalid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage += "This account has been disabled.";
          break;
        case 'auth/too-many-requests':
          errorMessage += "Too many failed attempts. Try again later.";
          break;
        default:
          errorMessage += err.message.replace("Firebase: ", "");
      }

      showError(errorEl, errorMessage);
    }
  });
}

/* =========================
   LOGOUT FUNCTION
========================= */
export async function logoutUser() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout error:", err);
  }
}

/* =========================
   CHECK AUTH STATE
========================= */
export function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that require authentication
    const protectedPages = ['dashboard.html', 'profile.html', 'settings.html'];
    
    // Pages that should redirect if already logged in
    const redirectIfLoggedIn = ['login.html', 'register.html', 'index.html'];
    
    if (user) {
      // User is logged in
      console.log("User logged in:", user.email);
      
      // If on login/register page while logged in, redirect to dashboard
      if (redirectIfLoggedIn.includes(currentPage)) {
        window.location.href = "dashboard.html";
      }
    } else {
      // User is not logged in
      console.log("No user logged in");
      
      // If on protected page while not logged in, redirect to login
      if (protectedPages.includes(currentPage)) {
        window.location.href = "login.html";
      }
    }
  });
}

/* =========================
   GET CURRENT USER DATA
========================= */
export async function getCurrentUserData() {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const snapshot = await get(ref(db, `users/${user.uid}`));
    return snapshot.val();
  } catch (err) {
    console.error("Error fetching user data:", err);
    return null;
  }
}

/* =========================
   HELPER FUNCTIONS
========================= */
function showError(element, message) {
  element.textContent = message;
  element.style.display = "block";
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

function showSuccess(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

/* =========================
   INITIALIZE AUTH CHECK
========================= */
// Call this when the page loads
document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  
  // Add logout functionality to logout buttons
  const logoutButtons = document.querySelectorAll('.logout-btn');
  logoutButtons.forEach(button => {
    button.addEventListener('click', logoutUser);
  });
});