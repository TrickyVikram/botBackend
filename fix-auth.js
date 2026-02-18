#!/usr/bin/env node

/**
 * Quick Fix for Authentication Token
 *
 * This script will create a test login and return a token that can be set manually
 */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const UserLicense = require("./models/UserLicense");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/automationBot";

(async function createTestToken() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find existing user
    const user = await UserLicense.findOne({ username: "vkumarsah999" });

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log(`\n👤 Found user: ${user.username}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 License Key: ${user.licenseKey}`);
    console.log(`📊 License Type: ${user.licenseType}`);
    console.log(`✅ Is Active: ${user.isActive}`);
    console.log(`⏰ Expires At: ${user.expiresAt}`);
    console.log(`📅 Days Remaining: ${user.getDaysRemaining()}`);

    // Generate new JWT token
    const token = jwt.sign(
      { userId: user._id, licenseKey: user.licenseKey },
      process.env.JWT_SECRET || "default-secret-key",
      { expiresIn: "7d" },
    );

    console.log("\n🔐 Generated JWT Token:");
    console.log("=======================");
    console.log(token);

    const expires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toUTCString();

    console.log("\n📋 To fix the authentication issue:");
    console.log("=====================================");
    console.log(
      "1. Open your browser and go to: https://botforntend.onrender.com/dashboard",
    );
    console.log("2. Open browser Developer Tools (F12 or Cmd+Opt+I)");
    console.log("3. Go to Console tab");
    console.log("4. Copy and paste this command:");
    console.log("\n" + "=".repeat(80));
    console.log(
      `document.cookie = "auth_token=${token}; expires=${expires}; path=/; SameSite=Strict";`,
    );
    console.log("=".repeat(80));
    console.log("\n5. Press Enter to run the command");
    console.log("6. Refresh the page (F5 or Cmd+R)");
    console.log(
      "7. The dashboard should now work without license expiry message!",
    );

    // Also test the token
    console.log("\n🧪 Testing token...");
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default-secret-key",
      );
      console.log("✅ Token is valid");
      console.log("Token expires in 7 days from now");
    } catch (error) {
      console.log("❌ Token is invalid:", error.message);
    }

    await mongoose.disconnect();
    console.log("\n🔗 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
