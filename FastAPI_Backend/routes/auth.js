const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/users");
const auth = require("../middleware/auth");

const router = express.Router();

// Multer storage (local folder /uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });


// Replace your createTransporter function in routes/auth.js with this:

const createTransporter = () => {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("EMAIL_USER and EMAIL_PASSWORD must be set in .env file");
  }

  // Try multiple configurations
  const configs = [
    {
      name: "Gmail Port 587",
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: "Gmail Service",
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        }
      }
    }
  ];

  // Use the first config by default
  const transporter = nodemailer.createTransport(configs[0].config);
  
  console.log(`📧 Email transporter created using: ${configs[0].name}`);
  
  return transporter;
};

// Improved send email function with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 2) => {
  const configs = [
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: false }
    },
    {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      }
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const transporter = nodemailer.createTransport(configs[i]);
    
    try {
      console.log(`Attempting to send email (config ${i + 1}/${configs.length})...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully with config ${i + 1}`);
      return info;
    } catch (error) {
      console.error(`❌ Config ${i + 1} failed:`, error.message);
      
      if (i === configs.length - 1) {
        // This was the last attempt
        throw error;
      }
      // Otherwise, continue to next config
    }
  }
};







// Check if email exists
router.post("/check-email", async (req, res) => {
  try {
    console.log("Checking email:", req.body);
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const exists = await User.exists({ email: email.toLowerCase().trim() });
    console.log("Email exists:", !!exists);
    
    res.json({ exists: !!exists });
  } catch (err) {
    console.error("Check email error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Register user
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    console.log("Registration attempt:", req.body);
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Trim and lowercase email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    // Create user
    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashed,
      image: imagePath,
    });
    
    console.log("New user registered:", user.email);

    res.status(201).json({ 
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    console.log("Login successful:", user.email);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        image: user.image,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Forgot Password - Send reset email
router.post("/forgot-password", async (req, res) => {
  try {
    console.log("Forgot password request:", req.body.email);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log("No user found with email:", email);
      return res.status(404).json({ error: "No account found with this email address" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token expiry (1 hour from now)
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save token to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    console.log("Reset token saved for:", email);

    // Create reset URL
// Change it to:
// Change it to:
const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/Frontend/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;    // Email content
    const mailOptions = {
      from: `"FeelWise Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - FeelWise',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6D4EFF, #8A2BE2); padding: 30px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .content p { color: #333; line-height: 1.6; margin: 15px 0; }
            .button { display: inline-block; padding: 15px 40px; background: linear-gradient(to right, #6D4EFF, #8A2BE2); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .button:hover { opacity: 0.9; }
            .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🧠 FeelWise</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Emotional Intelligence Platform</p>
            </div>
            <div class="content">
              <h2 style="color: #6D4EFF;">Password Reset Request</h2>
              <p>Hi there,</p>
              <p>We received a request to reset your password for your FeelWise account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security.
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6D4EFF; font-size: 12px;">${resetUrl}</p>
              
              <p style="margin-top: 30px; color: #666;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>© 2023 FeelWise. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    try {
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return res.status(500).json({ 
        error: "Failed to send email. Please check your email configuration." 
      });
    }
    
    res.json({ 
      message: "Password reset link has been sent to your email",
      success: true 
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to send reset email. Please try again later." });
  }
});

// Verify Reset Token
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ error: "Token and email are required" });
    }

    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    res.json({ valid: true, email: user.email });

  } catch (err) {
    console.error("Verify token error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`Password reset successful for: ${email}`);

    // Send confirmation email
    try {
      const mailOptions = {
        from: `"FeelWise Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Successful - FeelWise',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6D4EFF, #8A2BE2); padding: 30px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .content p { color: #333; line-height: 1.6; margin: 15px 0; }
              .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🧠 FeelWise</h1>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Emotional Intelligence Platform</p>
              </div>
              <div class="content">
                <h2 style="color: #28a745;">Password Reset Successful! ✓</h2>
                <div class="success-box">
                  <strong>Your password has been successfully reset.</strong>
                </div>
                <p>You can now log in to your FeelWise account with your new password.</p>
                <p>If you did not perform this action, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>© 2023 FeelWise. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
      // Don't fail the password reset if email fails
    }

    res.json({ 
      message: "Password reset successful. You can now login with your new password.",
      success: true 
    });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;

// Add this test endpoint to your routes/auth.js file

// Test email endpoint (for development only - remove in production)
router.post("/test-email", async (req, res) => {
  try {
    console.log("Testing email configuration...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASSWORD exists:", !!process.env.EMAIL_PASSWORD);
    console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD?.length);

    const transporter = createTransporter();

    // Verify connection
    await transporter.verify();
    console.log("✓ SMTP connection verified successfully");

    // Send test email
    const info = await transporter.sendMail({
      from: `"FeelWise Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: "Email Configuration Test",
      text: "If you received this, your email configuration is working!",
      html: "<p>If you received this, your email configuration is working! ✓</p>"
    });

    console.log("✓ Test email sent:", info.messageId);

    res.json({
      success: true,
      message: "Email configuration is working!",
      messageId: info.messageId
    });

  } catch (err) {
    console.error("❌ Email test failed:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.toString()
    });
  }
});