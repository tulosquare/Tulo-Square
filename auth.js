// auth.js - Updated to use your firebase.js module
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getCurrentUser,
  onAuthStateChanged,
  handleFirebaseError
} from './firebase.js';

// Add this to your HTML:
// <script type="module" src="auth.js"></script>

// Example usage in your login/register pages
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('signupForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      const result = await loginUser(email, password);
      if (result.success) {
        window.location.href = 'dashboard.html';
      } else {
        alert(handleFirebaseError(result.error));
      }
    });
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const name = document.getElementById('name').value;
      const phone = document.getElementById('phone').value;
      
      const userData = {
        displayName: name,
        phoneNumber: phone,
        userType: "community_member"
      };
      
      const result = await registerUser(email, password, userData);
      if (result.success) {
        window.location.href = 'dashboard.html';
      } else {
        alert(handleFirebaseError(result.error));
      }
    });
  }
});