const API_BASE = "http://localhost:5000/api/auth";
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const successMessage = document.getElementById("success-message");
const forgotPasswordLink = document.getElementById("forgot-password");

// Login functionality
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    successMessage.style.display = "none";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            loginError.style.display = "block";
            loginError.textContent = data.error || "Login failed";
            return;
        }

        // Store token & user (Note: Consider using more secure storage in production)
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        successMessage.style.display = "block";
        successMessage.textContent = "Login successful! Redirecting...";

        setTimeout(() => window.location.assign("profile.html"), 1000);
    } catch (err) {
        console.error("Login error:", err);
        loginError.style.display = "block";
        loginError.textContent = "An error occurred. Check console.";
    }
});

// Forgot Password functionality
forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    showForgotPasswordForm();
});

function showForgotPasswordForm() {
    // Hide login form elements
    const loginContainer = document.querySelector('.login-container');
    const originalContent = loginContainer.innerHTML;
    
    // Create forgot password form
    loginContainer.innerHTML = `
        <div class="logo">
            <div class="logo-circle">
                <i class="fas fa-brain"></i>
            </div>
            <div class="logo-text">
                <h1>FeelWise</h1>
                <p>Emotional Intelligence Platform</p>
            </div>
        </div>
        
        <h2>Reset Password</h2>
        <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 25px; font-size: 0.95rem;">
            Enter your email address and we'll help you reset your password.
        </p>
        
        <form id="forgot-password-form">
            <div class="input-group">
                <i class="fas fa-envelope input-icon"></i>
                <input type="email" id="reset-email" placeholder="Email Address" required />
            </div>
            
            <p class="error-message" id="forgot-error"></p>
            <p class="success-message" id="forgot-success"></p>
            
            <button type="submit">Send Reset Instructions <i class="fas fa-paper-plane" style="margin-left: 8px;"></i></button>
        </form>
        
        <p style="margin-top: 20px;">
            <a href="#" id="back-to-login">← Back to Login</a>
        </p>
        
        <div class="footer">
            <p>© 2023 FeelWise. All rights reserved.</p>
        </div>
    `;

    // Add event listeners for forgot password form
    const forgotForm = document.getElementById('forgot-password-form');
    const backToLogin = document.getElementById('back-to-login');
    const forgotError = document.getElementById('forgot-error');
    const forgotSuccess = document.getElementById('forgot-success');

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        forgotError.style.display = "none";
        forgotSuccess.style.display = "none";

        const email = document.getElementById('reset-email').value.trim();

        try {
            const res = await fetch(`${API_BASE}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                forgotError.style.display = "block";
                forgotError.textContent = data.error || "Failed to send reset instructions";
                return;
            }

            forgotSuccess.style.display = "block";
            forgotSuccess.textContent = "Reset instructions sent! Check your email.";
            
            // Show password reset form after successful email submission
            setTimeout(() => showPasswordResetForm(email), 2000);
            
        } catch (err) {
            console.error("Forgot password error:", err);
            forgotError.style.display = "block";
            forgotError.textContent = "An error occurred. Please try again.";
        }
    });

    backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.innerHTML = originalContent;
        // Re-add event listeners
        initializeLoginForm();
    });
}

function showPasswordResetForm(email) {
    const loginContainer = document.querySelector('.login-container');
    
    loginContainer.innerHTML = `
        <div class="logo">
            <div class="logo-circle">
                <i class="fas fa-brain"></i>
            </div>
            <div class="logo-text">
                <h1>FeelWise</h1>
                <p>Emotional Intelligence Platform</p>
            </div>
        </div>
        
        <h2>Set New Password</h2>
        <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 25px; font-size: 0.95rem;">
            Enter your new password for <strong>${email}</strong>
        </p>
        
        <form id="reset-password-form">
            <div class="input-group">
                <i class="fas fa-lock input-icon"></i>
                <input type="password" id="new-password" placeholder="New Password" required minlength="6"/>
            </div>
            
            <div class="input-group">
                <i class="fas fa-lock input-icon"></i>
                <input type="password" id="confirm-password" placeholder="Confirm New Password" required minlength="6"/>
            </div>
            
            <p class="error-message" id="reset-error"></p>
            <p class="success-message" id="reset-success"></p>
            
            <button type="submit">Update Password <i class="fas fa-check" style="margin-left: 8px;"></i></button>
        </form>
        
        <p style="margin-top: 20px;">
            <a href="#" id="back-to-login-final">← Back to Login</a>
        </p>
        
        <div class="footer">
            <p>© 2023 FeelWise. All rights reserved.</p>
        </div>
    `;

    // Add event listeners for password reset form
    const resetForm = document.getElementById('reset-password-form');
    const backToLogin = document.getElementById('back-to-login-final');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetError.style.display = "none";
        resetSuccess.style.display = "none";

        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Client-side validation
        if (newPassword !== confirmPassword) {
            resetError.style.display = "block";
            resetError.textContent = "Passwords do not match";
            return;
        }

        if (newPassword.length < 6) {
            resetError.style.display = "block";
            resetError.textContent = "Password must be at least 6 characters long";
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: email,
                    newPassword: newPassword 
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                resetError.style.display = "block";
                resetError.textContent = data.error || "Failed to reset password";
                return;
            }

            resetSuccess.style.display = "block";
            resetSuccess.textContent = "Password updated successfully! Redirecting to login...";
            
            // Redirect back to login after successful password reset
            setTimeout(() => {
                location.reload(); // Reload the page to show login form
            }, 2000);
            
        } catch (err) {
            console.error("Password reset error:", err);
            resetError.style.display = "block";
            resetError.textContent = "An error occurred. Please try again.";
        }
    });

    backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        location.reload(); // Reload the page to show login form
    });
}

function initializeLoginForm() {
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const successMessage = document.getElementById("success-message");
    const forgotPasswordLink = document.getElementById("forgot-password");

    // Re-add login form event listener
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.style.display = "none";
        successMessage.style.display = "none";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                loginError.style.display = "block";
                loginError.textContent = data.error || "Login failed";
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            successMessage.style.display = "block";
            successMessage.textContent = "Login successful! Redirecting...";

            setTimeout(() => window.location.assign("profile.html"), 1000);
        } catch (err) {
            console.error("Login error:", err);
            loginError.style.display = "block";
            loginError.textContent = "An error occurred. Check console.";
        }
    });

    // Re-add forgot password event listener
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        showForgotPasswordForm();
    });
}