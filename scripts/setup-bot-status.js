const mongoose = require("mongoose");
const BotStatus = require("../models/BotStatus");
const BotStatusService = require("../services/BotStatusService");

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/automationBot", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Create initial bot status
const createInitialBotStatus = async () => {
  try {
    console.log("🚀 Creating initial bot status...");

    // Create default user bot status
    const defaultStatus = await BotStatus.create({
      userId: "default",
      isActive: false,
      status: "idle",
      connectionsToday: 0,
      totalConnections: 0,
    });

    console.log("✅ Default bot status created:", defaultStatus);

    // Test the service methods
    console.log("\n🧪 Testing BotStatusService methods...");

    // Test getting status
    const statusResult = await BotStatusService.getBotStatus("default");
    console.log("📊 Current status:", statusResult);

    // Test starting bot
    console.log("\n🚀 Testing start bot...");
    await BotStatusService.startBot("default");

    // Test updating task
    console.log("\n📋 Testing update task...");
    await BotStatusService.updateCurrentTask("default", "Searching for leads");

    // Test updating connections
    console.log("\n📊 Testing update connections...");
    await BotStatusService.updateConnections("default", 5, 100);

    // Test pausing bot
    console.log("\n⏸️ Testing pause bot...");
    await BotStatusService.pauseBot("default");

    // Test resuming bot
    console.log("\n▶️ Testing resume bot...");
    await BotStatusService.resumeBot("default");

    // Test stopping bot
    console.log("\n🛑 Testing stop bot...");
    await BotStatusService.stopBot("default");

    // Get final status
    const finalStatus = await BotStatusService.getBotStatus("default");
    console.log("\n📊 Final status:", finalStatus);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    if (error.code === 11000) {
      console.log("ℹ️ Bot status already exists, updating...");

      // Update existing status
      const existingStatus = await BotStatus.findOneAndUpdate(
        { userId: "default" },
        {
          status: "idle",
          isActive: false,
          errorMessage: null,
        },
        { new: true },
      );

      console.log("✅ Existing bot status updated:", existingStatus);
    } else {
      console.error("❌ Error creating bot status:", error);
    }
  }
};

// Main function
const main = async () => {
  await connectDB();
  await createInitialBotStatus();

  console.log("\n🎉 Bot Status Database Setup Complete!");
  console.log("\n📋 Available API endpoints:");
  console.log("GET    /api/bot/status/default     - Get bot status");
  console.log("POST   /api/bot/start/default      - Start bot");
  console.log("POST   /api/bot/stop/default       - Stop bot");
  console.log("POST   /api/bot/pause/default      - Pause bot");
  console.log("POST   /api/bot/resume/default     - Resume bot");
  console.log("POST   /api/bot/connections/default - Update connections");
  console.log("POST   /api/bot/task/default       - Update current task");
  console.log("GET    /api/bot/all               - Get all bot statuses");

  process.exit(0);
};

// Run the script
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});

module.exports = { createInitialBotStatus };
