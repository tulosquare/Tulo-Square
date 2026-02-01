// Tulo Square Firebase Password Reset Logic
import { auth } from "./firebase.js";
import { 
  verifyPasswordResetCode, 
  confirmPasswordReset 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// DOM Elements
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get("oobCode");
const mode = urlParams.get("mode");

const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const resetBtn = document.getElementById("resetBtn");
const resetForm = document.getElementById("resetForm");
const resetError = document.getElementById("resetError");
const resetSuccess = document.getElementById("resetSuccess");
const resetTitle = document.getElementById("resetTitle");
const resetSubtitle = document.getElementById("resetSubtitle");
const infoMessage = document.getElementById("infoMessage");

// Check for valid reset link
if (mode !== 'resetPassword' || !oobCode) {
  // Invalid reset link
  showError('Invalid or expired reset link. Please request a new password reset email.');
  resetBtn.disabled = true;
  
  // Update UI for invalid state
  if (resetTitle) {
    resetTitle.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i> Invalid Reset Link';
    resetTitle.style.color = '#e74c3c';
  }
  
  if (resetSubtitle) {
    resetSubtitle.textContent = 'This password reset link is invalid or has expired';
    resetSubtitle.style.color = '#e74c3c';
  }
  
  if (infoMessage) {
    infoMessage.innerHTML = `
      <i class="fas fa-exclamation-circle" style="color: #e74c3c;"></i> 
      Please return to the <a href="forgot-password.html" style="color: #e67e22; text-decoration: underline;">forgot password page</a> 
      to request a new reset link.
    `;
    infoMessage.style.display = 'block';
  }
} else {
  // Valid reset link - verify it
  verifyPasswordResetCode(auth, oobCode)
    .then((email) => {
      // Successfully verified reset code
      console.log('Resetting password for:', email);
      
      // Update UI for verified state
      if (resetTitle) {
        resetTitle.innerHTML = '<i class="fas fa-shield-alt" style="color: #2ecc71;"></i> Set New Password';
      }
      
      if (resetSubtitle) {
        resetSubtitle.textContent = `Account: ${email}`;
        resetSubtitle.style.color = '#3498db';
      }
      
      if (infoMessage) {
        infoMessage.innerHTML = `
          <i class="fas fa-check-circle" style="color: #2ecc71;"></i> 
          Reset link verified. You can now set a new password for your Tulo Square account.
        `;
        infoMessage.style.display = 'block';
      }
      
      // Store email for reference
      localStorage.setItem('tulo_reset_email', email);
    })
    .catch((error) => {
      console.error('Reset code verification failed:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Invalid or expired reset link. ';
      
      switch (error.code) {
        case 'auth/expired-action-code':
          errorMessage += 'This link has expired (more than 1 hour old).';
          break;
        case 'auth/invalid-action-code':
          errorMessage += 'This link is invalid or has already been used.';
          break;
        case 'auth/user-disabled':
          errorMessage += 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage += 'No account found with this email.';
          break;
        default:
          errorMessage += 'Please request a new reset link.';
      }
      
      showError(errorMessage);
      resetBtn.disabled = true;
      
      // Update UI for invalid state
      if (resetTitle) {
        resetTitle.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i> Reset Link Error';
        resetTitle.style.color = '#e74c3c';
      }
      
      if (resetSubtitle) {
        resetSubtitle.textContent = 'Unable to verify reset link';
        resetSubtitle.style.color = '#e74c3c';
      }
    });
}

// Helper functions
function showError(message) {
  if (resetError) {
    resetError.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    resetError.style.display = 'block';
    resetError.style.color = '#e74c3c';
    
    // Hide any success message
    if (resetSuccess) {
      resetSuccess.style.display = 'none';
    }
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      resetError.style.display = 'none';
    }, 10000);
  }
}

function showSuccess(message) {
  if (resetSuccess) {
    resetSuccess.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    resetSuccess.style.display = 'block';
    resetSuccess.style.color = '#2ecc71';
    
    // Hide any error message
    if (resetError) {
      resetError.style.display = 'none';
    }
  }
}

function showLoading() {
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';
  }
}

function hideLoading() {
  if (resetBtn) {
    resetBtn.disabled = false;
    resetBtn.innerHTML = '<i class="fas fa-key"></i> Reset Password & Continue';
  }
}

// Password strength validation
function validatePassword(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  
  let strength = 0;
  Object.values(requirements).forEach(req => {
    if (req) strength += 20;
  });
  
  return { strength, requirements };
}

// Form submission handler
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  
  // Clear previous messages
  resetError.style.display = 'none';
  resetSuccess.style.display = 'none';
  
  // Basic validation
  if (!newPassword || !confirmPassword) {
    showError('Please fill in both password fields.');
    return;
  }
  
  // Password length validation
  if (newPassword.length < 8) {
    showError('Password must be at least 8 characters long.');
    return;
  }
  
  // Password strength validation
  const { strength, requirements } = validatePassword(newPassword);
  if (strength < 40) {
    showError('Please choose a stronger password. Include uppercase, lowercase, numbers, and special characters.');
    return;
  }
  
  // Password match validation
  if (newPassword !== confirmPassword) {
    showError('Passwords do not match. Please try again.');
    return;
  }
  
  // Show loading state
  showLoading();
  
  try {
    // Confirm password reset with Firebase
    await confirmPasswordReset(auth, oobCode, newPassword);
    
    // Success - update UI
    showSuccess('Password successfully reset! Redirecting to login...');
    
    // Get the email for the success message
    const email = localStorage.getItem('tulo_reset_email') || 'your account';
    
    // Update UI elements
    if (resetTitle) {
      resetTitle.innerHTML = '<i class="fas fa-check-circle" style="color: #2ecc71;"></i> Password Reset Complete!';
      resetTitle.style.color = '#2ecc71';
    }
    
    if (resetSubtitle) {
      resetSubtitle.textContent = `Your password has been updated for ${email}`;
      resetSubtitle.style.color = '#2ecc71';
    }
    
    if (infoMessage) {
      infoMessage.innerHTML = `
        <i class="fas fa-shield-alt" style="color: #2ecc71;"></i> 
        <strong>Security Updated:</strong> Your Tulo Square account password has been successfully reset. 
        You can now log in with your new password.
      `;
      infoMessage.style.display = 'block';
    }
    
    // Store optional security question/answer
    const securityQuestion = document.getElementById('securityQuestion')?.value;
    const securityAnswer = document.getElementById('securityAnswer')?.value;
    
    if (securityQuestion && securityAnswer) {
      try {
        // In a real app, you would send this to your backend
        // For now, store locally (this is not secure for production!)
        const sqData = {
          question: securityQuestion,
          answer: securityAnswer.trim(),
          timestamp: new Date().toISOString()
        };
        
        // This is just for demonstration - in production, use your backend
        console.log('Security question data:', sqData);
        
        // You could store this in Firebase Firestore or your own backend
        // await db.collection('security_questions').doc(email).set(sqData);
        
      } catch (sqError) {
        console.warn('Could not save security question:', sqError);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('tulo_reset_email');
    
    // Redirect to login after delay
    setTimeout(() => {
      window.location.href = `login.html?message=password_reset_success&email=${encodeURIComponent(email)}`;
    }, 3000);
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    // Handle specific Firebase errors
    let errorMessage = 'Failed to reset password. ';
    
    switch (error.code) {
      case 'auth/expired-action-code':
        errorMessage += 'This reset link has expired. Please request a new one.';
        break;
      case 'auth/invalid-action-code':
        errorMessage += 'Invalid reset code. Please request a new password reset.';
        break;
      case 'auth/user-disabled':
        errorMessage += 'This account has been disabled. Please contact support.';
        break;
      case 'auth/user-not-found':
        errorMessage += 'No account found with this email.';
        break;
      case 'auth/weak-password':
        errorMessage += 'Password is too weak. Please choose a stronger password.';
        break;
      case 'auth/too-many-requests':
        errorMessage += 'Too many attempts. Please try again later.';
        break;
      default:
        errorMessage += 'Please try again or request a new reset link.';
    }
    
    showError(errorMessage);
    hideLoading();
  }
});

// Add event listeners for real-time validation
if (newPasswordInput) {
  newPasswordInput.addEventListener('input', function() {
    // This would integrate with your existing password strength meter
    const password = this.value;
    const { strength, requirements } = validatePassword(password);
    
    // Update your UI elements here
    // For example, update the strength meter visual
    const meter = document.getElementById('strengthMeter');
    const label = document.getElementById('strengthLabel');
    
    if (meter && label) {
      meter.style.width = strength + '%';
      
      if (strength < 40) {
        meter.style.backgroundColor = '#e74c3c';
        label.textContent = 'Weak';
        label.style.color = '#e74c3c';
      } else if (strength < 70) {
        meter.style.backgroundColor = '#f39c12';
        label.textContent = 'Fair';
        label.style.color = '#f39c12';
      } else if (strength < 90) {
        meter.style.backgroundColor = '#3498db';
        label.textContent = 'Good';
        label.style.color = '#3498db';
      } else {
        meter.style.backgroundColor = '#2ecc71';
        label.textContent = 'Strong';
        label.style.color = '#2ecc71';
      }
    }
  });
}

if (confirmPasswordInput) {
  confirmPasswordInput.addEventListener('input', function() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = this.value;
    
    if (confirmPassword && newPassword !== confirmPassword) {
      this.classList.add('invalid');
      this.classList.remove('valid');
    } else if (confirmPassword) {
      this.classList.add('valid');
      this.classList.remove('invalid');
    } else {
      this.classList.remove('valid', 'invalid');
    }
  });
}

// Initialize loading dots animation if needed
document.addEventListener('DOMContentLoaded', function() {
  // Add CSS for loading dots if not already present
  if (!document.querySelector('#loadingDotsStyle')) {
    const style = document.createElement('style');
    style.id = 'loadingDotsStyle';
    style.textContent = `
      .loading-dots {
        display: inline-block;
      }
      .loading-dots span {
        animation: loading 1.5s infinite;
        opacity: 0;
      }
      .loading-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }
      .loading-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }
      @keyframes loading {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
});