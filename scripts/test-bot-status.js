/**
 * Test script to create default bot status in database
 */

require("dotenv").config();
const mongoose = require("mongoose");
const BotStatus = require("../models/BotStatus");

async function createDefaultBotStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/automationBot",
    );
    console.log("✅ Connected to MongoDB");

    // Create default bot status
    const defaultStatus = await BotStatus.findOneAndUpdate(
      { userID: "default" },
      {
        userID: "default",
        license: "trial",
        botStatus: "disable",
        isRunning: false,
        lastActivity: new Date(),
      },
      { upsert: true, new: true },
    );

    console.log("✅ Default bot status created/updated:", defaultStatus);

    // Test enable/disable functions
    console.log("\n🔧 Testing enable bot...");
    const enabledStatus = await BotStatus.enableBot("default", "premium");
    console.log("✅ Bot enabled:", enabledStatus);

    console.log("\n🔧 Testing disable bot...");
    const disabledStatus = await BotStatus.disableBot("default");
    console.log("✅ Bot disabled:", disabledStatus);

    console.log("\n🔧 Testing get bot status...");
    const currentStatus = await BotStatus.getBotStatus("default");
    console.log("✅ Current status:", currentStatus);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
}

// Run the test
createDefaultBotStatus();
