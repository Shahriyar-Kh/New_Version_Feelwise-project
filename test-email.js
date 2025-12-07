// Save this as test-email-complete.js
// Run with: node test-email-complete.js

require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("\n========================================");
console.log("FEELWISE EMAIL CONFIGURATION TEST");
console.log("========================================\n");

// Step 1: Check environment variables
console.log("📋 Step 1: Checking Environment Variables");
console.log("-------------------------------------------");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASSWORD exists:", !!process.env.EMAIL_PASSWORD);
console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD?.length);
console.log("EMAIL_PASSWORD preview:", process.env.EMAIL_PASSWORD?.substring(0, 4) + "************");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error("\n❌ ERROR: Missing EMAIL_USER or EMAIL_PASSWORD");
  process.exit(1);
}

if (process.env.EMAIL_PASSWORD.length !== 16) {
  console.warn("\n⚠️  WARNING: App Password should be exactly 16 characters!");
  console.warn("Current length:", process.env.EMAIL_PASSWORD.length);
  console.warn("Make sure you copied the App Password correctly (no spaces)");
}

// Step 2: Test multiple transporter configurations
console.log("\n📧 Step 2: Testing Email Configurations");
console.log("-------------------------------------------");

const configs = [
  {
    name: "Config 1: Gmail with Port 587 (TLS)",
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
    name: "Config 2: Gmail with Port 465 (SSL)",
    config: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      }
    }
  },
  {
    name: "Config 3: Gmail Service (Nodemailer shorthand)",
    config: {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      }
    }
  }
];

async function testConfig(configObj) {
  console.log(`\n🔧 Testing: ${configObj.name}`);
  const transporter = nodemailer.createTransport(configObj.config);

  try {
    // Verify connection
    console.log("   → Verifying SMTP connection...");
    await transporter.verify();
    console.log("   ✅ Connection verified!");

    // Send test email
    console.log("   → Sending test email...");
    const info = await transporter.sendMail({
      from: `"FeelWise Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Test Email - ${new Date().toLocaleTimeString()}`,
      text: "Test email sent successfully!",
      html: `
        <div style="padding: 20px; background: #f0f0f0; border-radius: 10px;">
          <h2 style="color: #6D4EFF;">✅ Email Configuration Working!</h2>
          <p>This test was sent at: ${new Date().toLocaleString()}</p>
          <p><strong>Configuration:</strong> ${configObj.name}</p>
        </div>
      `
    });

    console.log("   ✅ Email sent successfully!");
    console.log("   📨 Message ID:", info.messageId);
    console.log("\n🎉 SUCCESS! This configuration works!");
    console.log("Check your inbox:", process.env.EMAIL_USER);
    return true;

  } catch (error) {
    console.log("   ❌ Failed!");
    console.log("   Error:", error.message);
    
    if (error.code === 'EAUTH') {
      console.log("\n   🔴 AUTHENTICATION ERROR DETAILS:");
      console.log("   • Your credentials are being rejected by Gmail");
      console.log("   • Response:", error.response);
      
      console.log("\n   💡 POSSIBLE SOLUTIONS:");
      console.log("   1. Generate a NEW App Password at: https://myaccount.google.com/apppasswords");
      console.log("   2. Make sure 2-Factor Authentication is enabled");
      console.log("   3. Copy the 16-character password WITHOUT spaces");
      console.log("   4. Update your .env file with the new password");
      console.log("   5. Restart your server after updating .env");
    }
    
    return false;
  }
}

async function runTests() {
  console.log("\n🚀 Starting Tests...\n");
  
  let success = false;
  for (const config of configs) {
    const result = await testConfig(config);
    if (result) {
      success = true;
      break;
    }
  }

  if (!success) {
    console.log("\n" + "=".repeat(50));
    console.log("❌ ALL CONFIGURATIONS FAILED");
    console.log("=".repeat(50));
    console.log("\n📋 TROUBLESHOOTING CHECKLIST:");
    console.log("   [ ] Is 2FA enabled on your Gmail account?");
    console.log("   [ ] Did you generate an App Password (not regular password)?");
    console.log("   [ ] Did you copy the FULL 16-character App Password?");
    console.log("   [ ] Did you remove ALL spaces from the password?");
    console.log("   [ ] Did you update the .env file correctly?");
    console.log("   [ ] Did you restart your server after changing .env?");
    
    console.log("\n🔗 QUICK LINKS:");
    console.log("   • Enable 2FA: https://myaccount.google.com/security");
    console.log("   • App Passwords: https://myaccount.google.com/apppasswords");
    console.log("   • Gmail Settings: https://mail.google.com/mail/u/0/#settings/fwdandpop");
    
    console.log("\n⚠️  IF PROBLEM PERSISTS:");
    console.log("   Try using a different email service like:");
    console.log("   • Mailtrap (for testing): https://mailtrap.io");
    console.log("   • SendGrid (free tier): https://sendgrid.com");
    console.log("   • Mailgun (free tier): https://www.mailgun.com");
    
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});